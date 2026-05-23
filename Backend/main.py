import json
import os
import sqlite3
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from routes.paypal_billing import router as paypal_billing_router

from eden.account_routes import router as account_router, init_account_tables
from eden.auth import decode_access_token, router as auth_router
from eden.chats import (
    ensure_chat_for_user,
    get_chat_history,
    get_optional_user_id,
    init_chat_tables,
    router as chats_router,
    save_chat_message,
)
from eden.config import config
from eden.schemas import (
    ChatRequest,
    HealthResponse,
    MemorySaveRequest,
    ReadUrlRequest,
    ReadUrlResponse,
    SearchRequest,
    SearchResponse,
    TrainingApprovalRequest,
)

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "Frontend"
FRONTEND_PUBLIC_DIR = FRONTEND_DIR / "public"
DB_PATH = BASE_DIR / "data" / "memory.db"

ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH, override=True)

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "").strip()
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", config.FRONTEND_URL).strip().rstrip("/")

PAYPAL_PLAN_IDS = {
    "pro": os.getenv("PAYPAL_PRO_PLAN_ID", "").strip(),
    "premium": os.getenv("PAYPAL_PREMIUM_PLAN_ID", "").strip(),
    "family": os.getenv("PAYPAL_FAMILY_PLAN_ID", "").strip(),
    "go": os.getenv("PAYPAL_GO_PLAN_ID", "").strip(),
    "plus": os.getenv("PAYPAL_PLUS_PLAN_ID", "").strip(),
}

PAYPAL_BASE = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)

MEMORY_DEPTH_LIMITS = {
    "light": 4,
    "standard": 8,
    "extended": 16,
    "full": 32,
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db_safe() -> None:
    try:
        from eden.database import init_db

        init_db()
    except Exception as error:
        print(f"Eden database init skipped: {error}")


def log_startup_safe() -> None:
    try:
        from eden.logger import logger, log_event

        logger.info("=== Project Eden Backend Started ===")
        log_event("system_startup", {"env": config.ENV, "version": "0.2.0"})
    except Exception as error:
        print(f"Eden startup logger skipped: {error}")


def log_shutdown_safe() -> None:
    try:
        from eden.logger import logger, log_event

        logger.info("=== Project Eden Backend Stopped ===")
        log_event("system_shutdown", {"env": config.ENV})
    except Exception as error:
        print(f"Eden shutdown logger skipped: {error}")


def decode_user_from_auth(authorization: str | None) -> dict | None:
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "", 1).strip()

    if not token:
        return None

    try:
        payload = decode_access_token(token)
    except Exception:
        return None

    return payload or None


def get_user_id(authorization: str | None) -> str:
    payload = decode_user_from_auth(authorization)

    if not payload:
        raise HTTPException(status_code=401, detail="Missing or invalid auth token.")

    user_id = payload.get("email") or payload.get("sub") or payload.get("user_id") or payload.get("username")

    if not user_id:
        raise HTTPException(status_code=401, detail="Auth token does not contain a user id.")

    return str(user_id)


def decode_text_file(file_bytes: bytes) -> str:
    return file_bytes.decode("utf-8", errors="ignore")


def extract_pdf_text(file_bytes: bytes, max_pages: int = 10) -> str:
    try:
        import io
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""

        for page in reader.pages[:max_pages]:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"

        return text.strip()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(error)}",
        ) from error


def analyze_image_safe(file_bytes: bytes, content_type: str) -> str:
    try:
        from eden.vision import analyze_image_with_ai

        return analyze_image_with_ai(file_bytes, content_type)
    except Exception as error:
        return f"Image uploaded successfully, but AI image analysis is unavailable: {error}"


def get_paypal_token() -> str:
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        return ""

    res = requests.post(
        f"{PAYPAL_BASE}/v1/oauth2/token",
        headers={"Accept": "application/json"},
        data={"grant_type": "client_credentials"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        timeout=20,
    )

    if res.status_code != 200:
        print("PAYPAL TOKEN ERROR:", res.status_code, res.text)
        return ""

    return res.json().get("access_token", "")


def build_messages_safe(
    user_message: str,
    history: list[dict],
    reasoning_level: str,
    memory_depth: str,
) -> list[dict]:
    try:
        from eden.brain import build_messages

        return build_messages(
            user_message=user_message,
            history=history,
            reasoning_level=reasoning_level,
            memory_depth=memory_depth,
        )
    except Exception:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Eden, a private AI assistant built for Project Eden. "
                    "Be direct, useful, and concise."
                ),
            }
        ]
        messages.extend(history[-12:])
        messages.append({"role": "user", "content": user_message})
        return messages


def stream_language_core_safe(messages: list[dict]):
    try:
        from eden.language_core import stream_language_core

        yielded = False
        for chunk in stream_language_core(messages):
            yielded = True
            yield chunk

        if not yielded:
            yield "Eden returned no response."
    except Exception as error:
        fallback = (
            "Eden backend is running, but the language core is not fully configured yet. "
            f"Details: {error}"
        )
        yield fallback


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_safe()
    init_chat_tables()
    log_startup_safe()
    yield
    log_shutdown_safe()


app = FastAPI(
    title="Project Eden Backend",
    version="0.2.0",
    lifespan=lifespan,
    debug=config.DEBUG,
)

@app.on_event("startup")
def startup_account_tables():
    init_account_tables()

app.include_router(account_router)

app.add_middleware(
    SessionMiddleware,
    secret_key=config.JWT_SECRET,
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chats_router)

STATIC_MOUNTS = {
    "/logos": FRONTEND_PUBLIC_DIR / "logos",
    "/sounds": FRONTEND_PUBLIC_DIR / "sounds",
    "/backgrounds": FRONTEND_PUBLIC_DIR / "backgrounds",
    "/placeholders": FRONTEND_PUBLIC_DIR / "placeholders",
}

for mount_path, directory in STATIC_MOUNTS.items():
    if directory.exists():
        app.mount(mount_path, StaticFiles(directory=str(directory)), name=mount_path.strip("/"))

if FRONTEND_DIR.exists():
    app.mount("/Frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="Frontend")


@app.get("/", response_class=HTMLResponse)
async def frontend():
    index_file = FRONTEND_DIR / "index.html"

    if index_file.exists():
        return FileResponse(index_file)

    return HTMLResponse("<h1>Project Eden Backend Running</h1>")


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "healthy", "version": "0.2.0"}


@app.post("/chat")
async def chat(
    request: ChatRequest,
    authorization: str | None = Header(default=None),
):
    session_id = request.session_id or "default"
    user_id = get_optional_user_id(authorization)
    memory_depth = getattr(request, "memory_depth", "standard") or "standard"
    reasoning_level = getattr(request, "reasoning_level", "balanced") or "balanced"

    async def event_stream():
        full_response = ""

        try:
            history = []
            history_limit = MEMORY_DEPTH_LIMITS.get(memory_depth, 8)

            if user_id and session_id.startswith("chat-"):
                ensure_chat_for_user(session_id, user_id, first_message=request.message)
                history = get_chat_history(session_id, user_id, limit=history_limit)
                save_chat_message(session_id, user_id, "user", request.message)

            messages = build_messages_safe(
                user_message=request.message,
                history=history,
                reasoning_level=reasoning_level,
                memory_depth=memory_depth,
            )

            for chunk in stream_language_core_safe(messages):
                if not chunk:
                    continue

                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            if not full_response:
                full_response = "Eden returned no response."
                yield f"data: {json.dumps({'chunk': full_response})}\n\n"

            if user_id and session_id.startswith("chat-"):
                save_chat_message(session_id, user_id, "assistant", full_response)

            yield f"data: {json.dumps({'done': True, 'reasoning_level': reasoning_level, 'memory_depth': memory_depth})}\n\n"

        except Exception as error:
            yield f"data: {json.dumps({'error': str(error)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/upload/analyze")
async def upload_analyze(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    user_id = get_user_id(authorization)
    content_type = file.content_type or ""
    filename = file.filename or "upload"
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if content_type.startswith("image/"):
        return {
            "type": "image",
            "filename": filename,
            "size_bytes": len(file_bytes),
            "user_id": user_id,
            "message": "Image uploaded successfully.",
            "analysis": analyze_image_safe(file_bytes, content_type),
        }

    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        text = extract_pdf_text(file_bytes)
        return {
            "type": "pdf",
            "filename": filename,
            "size_bytes": len(file_bytes),
            "user_id": user_id,
            "text_preview": text[:4000] or "PDF uploaded, but no readable text was extracted.",
        }

    text_extensions = (
        ".txt",
        ".md",
        ".py",
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".json",
        ".html",
        ".css",
        ".xml",
        ".csv",
        ".yaml",
        ".yml",
    )

    if content_type.startswith("text/") or filename.lower().endswith(text_extensions):
        text = decode_text_file(file_bytes)
        return {
            "type": "text",
            "filename": filename,
            "size_bytes": len(file_bytes),
            "user_id": user_id,
            "text_preview": text[:4000] or "Text file uploaded, but no readable text was found.",
        }

    raise HTTPException(status_code=400, detail="Unsupported file type.")


@app.post("/billing/paypal/create-subscription")
async def create_subscription(authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)

    if not PAYPAL_CLIENT_ID:
        raise HTTPException(status_code=500, detail="PAYPAL_CLIENT_ID is missing.")

    if not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PAYPAL_CLIENT_SECRET is missing.")

    if not PAYPAL_PLAN_ID:
        raise HTTPException(status_code=500, detail="PAYPAL_PLAN_ID is missing.")

    token = get_paypal_token()

    if not token:
        raise HTTPException(
            status_code=500,
            detail="Could not get PayPal access token. Check PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_MODE.",
        )

    res = requests.post(
        f"{PAYPAL_BASE}/v1/billing/subscriptions",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={
            "plan_id": PAYPAL_PLAN_ID,
            "custom_id": user_id,
            "application_context": {
                "brand_name": "Project Eden",
                "locale": "en-US",
                "shipping_preference": "NO_SHIPPING",
                "user_action": "SUBSCRIBE_NOW",
                "return_url": f"{FRONTEND_URL}/?sub=success",
                "cancel_url": f"{FRONTEND_URL}/?sub=cancel",
            },
        },
        timeout=20,
    )

    raw_text = res.text

    try:
        data = res.json()
    except Exception:
        data = {"raw_response": raw_text}

    if res.status_code not in [200, 201]:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "PayPal rejected the subscription request.",
                "paypal_status": res.status_code,
                "paypal_raw": raw_text,
                "paypal_json": data,
                "mode": PAYPAL_MODE,
                "plan_id": PAYPAL_PLAN_ID,
            },
        )

    subscription_id = data.get("id", "")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                user_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                plan_id TEXT,
                paypal_subscription_id TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        con.execute(
            """
            INSERT OR REPLACE INTO subscriptions
            (user_id, status, plan_id, paypal_subscription_id, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, "pending", PAYPAL_PLAN_ID, subscription_id, now_iso()),
        )
        con.commit()

    for link in data.get("links", []):
        if link.get("rel") == "approve":
            return {"url": link.get("href")}

    raise HTTPException(status_code=500, detail="PayPal approval URL missing.")


@app.get("/billing/status")
async def billing_status(authorization: str | None = Header(default=None)):
    user_id = get_user_id(authorization)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS subscriptions (
                user_id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                plan_id TEXT,
                paypal_subscription_id TEXT,
                updated_at TEXT NOT NULL
            )
            """
        )
        row = con.execute(
            "SELECT status, plan_id, paypal_subscription_id, updated_at FROM subscriptions WHERE user_id = ?",
            (user_id,),
        ).fetchone()

    if not row:
        return {"status": "free"}

    return {
        "status": row[0],
        "plan_id": row[1],
        "paypal_subscription_id": row[2],
        "updated_at": row[3],
    }


@app.post("/paypal/webhook")
async def paypal_webhook(request: Request):
    body = await request.json()
    event_type = body.get("event_type", "")
    resource = body.get("resource", {})

    subscription_id = resource.get("id") or resource.get("billing_agreement_id")
    custom_id = resource.get("custom_id")

    status = None

    if event_type in ["BILLING.SUBSCRIPTION.ACTIVATED", "BILLING.SUBSCRIPTION.CREATED"]:
        status = "active"
    elif event_type in ["BILLING.SUBSCRIPTION.CANCELLED", "BILLING.SUBSCRIPTION.SUSPENDED", "BILLING.SUBSCRIPTION.EXPIRED"]:
        status = "inactive"
    elif event_type in ["PAYMENT.SALE.COMPLETED", "PAYMENT.CAPTURE.COMPLETED"]:
        status = "active"

    if custom_id and status:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(DB_PATH) as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS subscriptions (
                    user_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    plan_id TEXT,
                    paypal_subscription_id TEXT,
                    updated_at TEXT NOT NULL
                )
                """
            )
            con.execute(
                """
                INSERT OR REPLACE INTO subscriptions
                (user_id, status, plan_id, paypal_subscription_id, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (custom_id, status, PAYPAL_PLAN_ID, subscription_id, now_iso()),
            )
            con.commit()

    return {"status": "received"}


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    try:
        from eden.search import search_web

        results = search_web(request.query, request.limit)
        return SearchResponse(results=results)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Search failed: {error}") from error


@app.post("/read-url", response_model=ReadUrlResponse)
async def read_url_endpoint(request: ReadUrlRequest):
    try:
        from eden.reader import read_url

        return read_url(request.url)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to read URL: {error}") from error


@app.post("/memory/save")
async def save_memory_endpoint(request: MemorySaveRequest):
    try:
        from eden.memory import save_memory as save_memory_record

        save_memory_record(
            session_id=request.session_id,
            content=request.content,
            tags=request.tags,
        )
        return {"status": "saved"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {error}") from error


@app.get("/memory/search")
async def memory_search(query: str, limit: int = 5):
    try:
        from eden.memory import search_memory

        return {"memories": search_memory(query, limit)}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to search memory: {error}") from error


@app.post("/training/approve")
async def training_approve(request: TrainingApprovalRequest):
    try:
        from eden.trainer import approve_training_example

        example = {
            "input": request.input_text,
            "output": request.output_text,
            "source": request.source,
            "approved": True,
            "created_at": now_iso(),
        }
        approve_training_example(example)
        return {"status": "approved"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to approve training example: {error}") from error


@app.post("/training/reject")
async def training_reject(request: TrainingApprovalRequest, reason: str = "unspecified"):
    try:
        from eden.trainer import reject_training_example

        example = {
            "input": request.input_text,
            "output": request.output_text,
            "source": request.source,
            "approved": False,
            "reason": reason,
            "created_at": now_iso(),
        }
        reject_training_example(example, reason)
        return {"status": "rejected"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to reject training example: {error}") from error


@app.post("/train")
async def train():
    try:
        from eden.trainer import train_model

        return {"message": train_model()}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Training failed: {error}") from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=config.DEBUG)
