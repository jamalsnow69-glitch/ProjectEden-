import sqlite3
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from eden.auth import decode_access_token
from eden.config import config

router = APIRouter(prefix="/chats", tags=["chats"])


class ChatCreateRequest(BaseModel):
    title: Optional[str] = Field(default="New Chat", max_length=80)


class ChatRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=80)


class ChatMessageRequest(BaseModel):
    sender: str
    text: str


VALID_SENDERS = {"user", "eden", "assistant", "system"}


def now_ms() -> int:
    return int(time.time() * 1000)


def get_db_path() -> Path:
    path = Path(config.DATABASE_PATH)

    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent / path

    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def init_chat_tables() -> None:
    with sqlite3.connect(get_db_path()) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """
        )

        con.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE
            )
            """
        )

        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON chats(user_id, updated_at)"
        )

        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON chat_messages(chat_id, created_at)"
        )

        con.commit()


def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token.")

    token = authorization.replace("Bearer ", "", 1).strip()

    if not token:
        raise HTTPException(status_code=401, detail="Missing auth token.")

    try:
        payload = decode_access_token(token)
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid auth token.") from error

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid auth token.")

    user_id = (
        payload.get("email")
        or payload.get("sub")
        or payload.get("user_id")
        or payload.get("username")
    )

    if not user_id:
        raise HTTPException(status_code=401, detail="Token is missing user identity.")

    return str(user_id)


def get_optional_user_id(authorization: str | None) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.replace("Bearer ", "", 1).strip()

    if not token:
        return None

    try:
        payload = decode_access_token(token)
    except Exception:
        return None

    if not payload:
        return None

    user_id = (
        payload.get("email")
        or payload.get("sub")
        or payload.get("user_id")
        or payload.get("username")
    )

    return str(user_id) if user_id else None


def clean_title(value: str | None) -> str:
    title = str(value or "New Chat").strip()
    return title[:80] or "New Chat"


def clean_sender(value: str) -> str:
    sender = str(value or "user").strip().lower()

    if sender == "assistant":
        return "eden"

    if sender not in VALID_SENDERS:
        raise HTTPException(status_code=400, detail="Invalid message sender.")

    return sender


def sender_to_role(sender: str) -> str:
    sender = clean_sender(sender)

    if sender == "eden":
        return "assistant"

    return sender


def role_to_sender(role: str) -> str:
    role = str(role or "user").strip().lower()

    if role == "assistant":
        return "eden"

    if role in {"eden", "system", "user"}:
        return role

    return "user"


def clean_text(value: str) -> str:
    return str(value or "").strip()


def assert_chat_owner(chat_id: str, user_id: str) -> None:
    with sqlite3.connect(get_db_path()) as con:
        row = con.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Chat not found.")


def ensure_chat_for_user(
    chat_id: str,
    user_id: str,
    first_message: Optional[str] = None,
    title: Optional[str] = None,
) -> None:
    init_chat_tables()

    resolved_title = clean_title(title)

    if first_message and resolved_title == "New Chat":
        resolved_title = clean_title(first_message[:36])

    timestamp = now_ms()

    with sqlite3.connect(get_db_path()) as con:
        existing = con.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user_id),
        ).fetchone()

        if not existing:
            con.execute(
                """
                INSERT INTO chats (id, user_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (chat_id, user_id, resolved_title, timestamp, timestamp),
            )
        elif first_message:
            con.execute(
                """
                UPDATE chats
                SET title = ?, updated_at = ?
                WHERE id = ? AND user_id = ? AND title = 'New Chat'
                """,
                (resolved_title, timestamp, chat_id, user_id),
            )

        con.commit()


def save_chat_message(chat_id: str, user_id: str, sender: str, text: str) -> None:
    init_chat_tables()

    sender = clean_sender(sender)
    text = clean_text(text)

    if not text:
        return

    timestamp = now_ms()
    message_id = f"msg-{uuid.uuid4().hex[:16]}"

    with sqlite3.connect(get_db_path()) as con:
        last_message = con.execute(
            """
            SELECT sender, text
            FROM chat_messages
            WHERE chat_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (chat_id, user_id),
        ).fetchone()

        if last_message and last_message[0] == sender and last_message[1] == text:
            return

        con.execute(
            """
            INSERT INTO chat_messages (id, chat_id, user_id, sender, text, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (message_id, chat_id, user_id, sender, text, timestamp),
        )

        con.execute(
            "UPDATE chats SET updated_at = ? WHERE id = ? AND user_id = ?",
            (timestamp, chat_id, user_id),
        )

        con.commit()


def get_chat_history(chat_id: str, user_id: str, limit: int = 20) -> list[dict]:
    init_chat_tables()

    with sqlite3.connect(get_db_path()) as con:
        rows = con.execute(
            """
            SELECT sender, text
            FROM chat_messages
            WHERE chat_id = ? AND user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (chat_id, user_id, limit),
        ).fetchall()

    rows.reverse()

    return [
        {
            "role": sender_to_role(sender),
            "content": text,
        }
        for sender, text in rows
    ]


@router.get("")
def list_chats(authorization: str | None = Header(default=None)):
    init_chat_tables()
    user_id = get_user_id(authorization)

    with sqlite3.connect(get_db_path()) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM chats
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()

    return {"chats": [dict(row) for row in rows]}


@router.post("")
def create_chat(
    body: ChatCreateRequest,
    authorization: str | None = Header(default=None),
):
    init_chat_tables()
    user_id = get_user_id(authorization)

    chat_id = f"chat-{uuid.uuid4().hex[:16]}"
    timestamp = now_ms()
    title = clean_title(body.title)

    with sqlite3.connect(get_db_path()) as con:
        con.execute(
            """
            INSERT INTO chats (id, user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (chat_id, user_id, title, timestamp, timestamp),
        )
        con.commit()

    return {
        "id": chat_id,
        "title": title,
        "created_at": timestamp,
        "updated_at": timestamp,
    }


@router.patch("/{chat_id}")
def rename_chat(
    chat_id: str,
    body: ChatRenameRequest,
    authorization: str | None = Header(default=None),
):
    init_chat_tables()
    user_id = get_user_id(authorization)
    title = clean_title(body.title)
    timestamp = now_ms()

    with sqlite3.connect(get_db_path()) as con:
        cursor = con.execute(
            """
            UPDATE chats
            SET title = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (title, timestamp, chat_id, user_id),
        )
        con.commit()

    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Chat not found.")

    return {
        "id": chat_id,
        "title": title,
        "updated_at": timestamp,
    }


@router.delete("/{chat_id}")
def delete_chat(
    chat_id: str,
    authorization: str | None = Header(default=None),
):
    init_chat_tables()
    user_id = get_user_id(authorization)

    with sqlite3.connect(get_db_path()) as con:
        chat = con.execute(
            "SELECT id FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user_id),
        ).fetchone()

        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found.")

        con.execute(
            "DELETE FROM chat_messages WHERE chat_id = ? AND user_id = ?",
            (chat_id, user_id),
        )

        con.execute(
            "DELETE FROM chats WHERE id = ? AND user_id = ?",
            (chat_id, user_id),
        )

        con.commit()

    return {
        "status": "deleted",
        "id": chat_id,
    }


@router.get("/{chat_id}/messages")
def list_messages(
    chat_id: str,
    authorization: str | None = Header(default=None),
):
    init_chat_tables()
    user_id = get_user_id(authorization)
    assert_chat_owner(chat_id, user_id)

    with sqlite3.connect(get_db_path()) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(
            """
            SELECT sender, text, created_at
            FROM chat_messages
            WHERE chat_id = ? AND user_id = ?
            ORDER BY created_at ASC
            """,
            (chat_id, user_id),
        ).fetchall()

    return {"messages": [dict(row) for row in rows]}


@router.post("/{chat_id}/messages")
def add_message(
    chat_id: str,
    body: ChatMessageRequest,
    authorization: str | None = Header(default=None),
):
    init_chat_tables()
    user_id = get_user_id(authorization)
    assert_chat_owner(chat_id, user_id)

    sender = clean_sender(body.sender)
    text = clean_text(body.text)

    if not text:
        return {"status": "ignored"}

    save_chat_message(chat_id, user_id, sender, text)

    return {
        "status": "saved",
        "chat_id": chat_id,
        "sender": sender,
        "text": text,
    }
