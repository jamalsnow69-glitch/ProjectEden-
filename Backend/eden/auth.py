import json
import sqlite3
import secrets
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode

import pyotp
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

from eden.config import config

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
AUTH_DB_PATH = BASE_DIR / "data" / "auth.db"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth = OAuth()

if config.GOOGLE_CLIENT_ID and config.GOOGLE_CLIENT_SECRET:
    oauth.register(
        name="google",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if config.GITHUB_CLIENT_ID and config.GITHUB_CLIENT_SECRET:
    oauth.register(
        name="github",
        client_id=config.GITHUB_CLIENT_ID,
        client_secret=config.GITHUB_CLIENT_SECRET,
        access_token_url="https://github.com/login/oauth/access_token",
        authorize_url="https://github.com/login/oauth/authorize",
        api_base_url="https://api.github.com/",
        client_kwargs={"scope": "read:user user:email"},
    )

if config.DISCORD_CLIENT_ID and config.DISCORD_CLIENT_SECRET:
    oauth.register(
        name="discord",
        client_id=config.DISCORD_CLIENT_ID,
        client_secret=config.DISCORD_CLIENT_SECRET,
        access_token_url="https://discord.com/api/oauth2/token",
        authorize_url="https://discord.com/api/oauth2/authorize",
        api_base_url="https://discord.com/api/",
        client_kwargs={"scope": "identify email"},
    )


class SignupRequest(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=3, max_length=160)
    password: str = Field(min_length=8, max_length=256)


class LoginRequest(BaseModel):
    email_or_username: str = Field(min_length=1, max_length=160)
    password: str = Field(min_length=1, max_length=256)


class TwoFactorLoginVerifyRequest(BaseModel):
    pending_token: str
    code: str = Field(min_length=6, max_length=32)


class TwoFactorSetupVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class TwoFactorDisableRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class BackupCodesRefreshRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_auth_connection() -> sqlite3.Connection:
    AUTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(AUTH_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    existing = {row[1] for row in rows}

    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def init_auth_db() -> None:
    with get_auth_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT UNIQUE,
                password_hash TEXT,
                google_sub TEXT UNIQUE,
                github_id TEXT UNIQUE,
                discord_id TEXT UNIQUE,
                avatar_url TEXT,
                twofa_enabled INTEGER NOT NULL DEFAULT 0,
                twofa_secret TEXT,
                backup_codes_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        migrations = {
            "password_hash": "TEXT",
            "github_id": "TEXT UNIQUE",
            "discord_id": "TEXT UNIQUE",
            "avatar_url": "TEXT",
            "twofa_enabled": "INTEGER NOT NULL DEFAULT 0",
            "twofa_secret": "TEXT",
            "backup_codes_json": "TEXT",
            "updated_at": "TEXT",
        }

        for column, definition in migrations.items():
            ensure_column(conn, "users", column, definition)

        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)")
        conn.commit()


init_auth_db()


def row_to_user(row: sqlite3.Row | None) -> dict | None:
    return dict(row) if row else None


def public_user(user: dict) -> dict:
    return {
        "id": user.get("id"),
        "username": user.get("username"),
        "email": user.get("email"),
        "avatar_url": user.get("avatar_url"),
        "twofa_enabled": bool(user.get("twofa_enabled")),
        "has_password": bool(user.get("password_hash")),
        "providers": {
            "google": bool(user.get("google_sub")),
            "github": bool(user.get("github_id")),
            "discord": bool(user.get("discord_id")),
        },
        "created_at": user.get("created_at"),
        "updated_at": user.get("updated_at"),
    }


def clean_email(value: str | None) -> str | None:
    if not value:
        return None

    email = str(value).strip().lower()

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address.")

    return email


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return pwd_context.verify(password, password_hash)


def create_access_token(user: dict) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "type": "access",
        "sub": str(user["id"]),
        "user_id": str(user["id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "twofa": bool(user.get("twofa_enabled")),
        "exp": expires,
    }

    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def create_pending_2fa_token(user: dict) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)

    payload = {
        "type": "2fa_pending",
        "sub": str(user["id"]),
        "user_id": str(user["id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "exp": expires,
    }

    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except JWTError:
        return None

    if payload.get("type") not in {None, "access"}:
        return None

    return payload


def decode_pending_2fa_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except JWTError:
        return None

    if payload.get("type") != "2fa_pending":
        return None

    return payload


def get_user_by_id(user_id: str | int) -> dict | None:
    init_auth_db()

    with get_auth_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (str(user_id),)).fetchone()

    return row_to_user(row)


def get_user_by_email_or_username(value: str) -> dict | None:
    init_auth_db()
    value = value.strip()

    with get_auth_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)",
            (value, value),
        ).fetchone()

    return row_to_user(row)


def get_current_user_from_header(authorization: str | None) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header.")

    token = authorization.replace("Bearer ", "", 1).strip()
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = get_user_by_id(payload.get("sub") or payload.get("user_id"))

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return user


def issue_login_response(user: dict) -> dict:
    if user.get("twofa_enabled"):
        return {
            "requires_2fa": True,
            "pending_token": create_pending_2fa_token(user),
            "token_type": "pending_2fa",
            "user": public_user(user),
        }

    return {
        "requires_2fa": False,
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }


def create_backup_codes(count: int = 10) -> list[str]:
    return [f"{uuid_part()}-{uuid_part()}" for _ in range(count)]


def uuid_part() -> str:
    import secrets

    return secrets.token_hex(4).upper()


def get_backup_codes(user: dict) -> list[str]:
    try:
        raw = user.get("backup_codes_json") or "[]"
        codes = json.loads(raw)
        return codes if isinstance(codes, list) else []
    except Exception:
        return []


def set_backup_codes(user_id: int | str, codes: list[str]) -> None:
    with get_auth_connection() as conn:
        conn.execute(
            "UPDATE users SET backup_codes_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(codes), now_iso(), str(user_id)),
        )
        conn.commit()


def verify_totp_or_backup_code(user: dict, code: str) -> bool:
    clean_code = str(code or "").replace(" ", "").strip()
    secret = user.get("twofa_secret")

    if secret:
        try:
            if pyotp.TOTP(secret).verify(clean_code, valid_window=1):
                return True
        except Exception:
            pass

    normalized_backup = clean_code.upper()
    backup_codes = get_backup_codes(user)

    if normalized_backup in backup_codes:
        backup_codes.remove(normalized_backup)
        set_backup_codes(user["id"], backup_codes)
        return True

    return False


def create_or_get_oauth_user(
    provider: str,
    provider_id: str,
    email: str | None,
    username: str | None,
    avatar_url: str | None = None,
) -> dict:
    init_auth_db()

    provider_column = {
        "google": "google_sub",
        "github": "github_id",
        "discord": "discord_id",
    }.get(provider)

    if not provider_column:
        raise HTTPException(status_code=400, detail="Unsupported OAuth provider.")

    clean_email_value = clean_email(email) if email else None
    clean_username = username or clean_email_value or f"{provider.title()} User"
    timestamp = now_iso()

    with get_auth_connection() as conn:
        existing = conn.execute(
            f"SELECT * FROM users WHERE {provider_column} = ? OR email = ?",
            (provider_id, clean_email_value),
        ).fetchone()

        if existing:
            user = dict(existing)
            conn.execute(
                f"""
                UPDATE users
                SET {provider_column} = COALESCE({provider_column}, ?),
                    email = COALESCE(email, ?),
                    username = COALESCE(username, ?),
                    avatar_url = COALESCE(?, avatar_url),
                    updated_at = ?
                WHERE id = ?
                """,
                (provider_id, clean_email_value, clean_username, avatar_url, timestamp, user["id"]),
            )
            conn.commit()
            return get_user_by_id(user["id"]) or user

        cursor = conn.execute(
            f"""
            INSERT INTO users
            (username, email, {provider_column}, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (clean_username, clean_email_value, provider_id, avatar_url, timestamp, timestamp),
        )
        conn.commit()

        user = get_user_by_id(cursor.lastrowid)

    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user.")

    return user


def redirect_with_login_result(user: dict) -> RedirectResponse:
    if user.get("twofa_enabled"):
        query = urlencode(
            {
                "requires_2fa": "true",
                "pending_token": create_pending_2fa_token(user),
                "username": user.get("username", ""),
                "email": user.get("email", ""),
            }
        )
        return RedirectResponse(f"{config.FRONTEND_URL.rstrip('/')}/?{query}")

    query = urlencode(
        {
            "token": create_access_token(user),
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "picture": user.get("avatar_url", "") or "",
        }
    )
    return RedirectResponse(f"{config.FRONTEND_URL.rstrip('/')}/?{query}")


@router.post("/auth/signup")
def signup(body: SignupRequest):
    init_auth_db()

    username = body.username.strip()
    email = clean_email(body.email)
    password_hash = hash_password(body.password)
    timestamp = now_iso()

    with get_auth_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)",
            (email, username),
        ).fetchone()

        if existing:
            raise HTTPException(status_code=409, detail="Username or email already exists.")

        cursor = conn.execute(
            """
            INSERT INTO users (username, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (username, email, password_hash, timestamp, timestamp),
        )
        conn.commit()

    user = get_user_by_id(cursor.lastrowid)

    if not user:
        raise HTTPException(status_code=500, detail="Signup failed.")

    return issue_login_response(user)


@router.post("/auth/login")
def login(body: LoginRequest):
    user = get_user_by_email_or_username(body.email_or_username)

    if not user or not verify_password(body.password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid login credentials.")

    return issue_login_response(user)


@router.post("/auth/2fa/login-verify")
def verify_2fa_login(body: TwoFactorLoginVerifyRequest):
    payload = decode_pending_2fa_token(body.pending_token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA token.")

    user = get_user_by_id(payload.get("sub") or payload.get("user_id"))

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if not verify_totp_or_backup_code(user, body.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")

    return {
        "requires_2fa": False,
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": public_user(user),
    }


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@router.get("/auth/google/login")
async def google_login(request: Request):
    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET or not config.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured.")

    state = secrets.token_urlsafe(24)
    request.session["google_oauth_state"] = state

    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }

    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/auth/google/callback")
async def google_callback(request: Request, code: str | None = None, state: str | None = None):
    expected_state = request.session.pop("google_oauth_state", None)

    if not expected_state or not state or expected_state != state:
        raise HTTPException(status_code=400, detail="Google OAuth state mismatch. Try again from the login button.")

    if not code:
        raise HTTPException(status_code=400, detail="Missing Google authorization code.")

    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": config.GOOGLE_REDIRECT_URI,
        },
        timeout=20,
    )

    token_data = token_response.json()

    if token_response.status_code >= 400 or "access_token" not in token_data:
        raise HTTPException(status_code=400, detail={"message": "Google token exchange failed.", "google": token_data})

    user_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
        timeout=20,
    )

    user_info = user_response.json()

    if user_response.status_code >= 400 or not user_info.get("sub"):
        raise HTTPException(status_code=400, detail={"message": "Google userinfo failed.", "google": user_info})

    user = create_or_get_oauth_user(
        provider="google",
        provider_id=str(user_info.get("sub")),
        email=user_info.get("email"),
        username=user_info.get("name"),
        avatar_url=user_info.get("picture"),
    )

    return redirect_with_login_result(user)

@router.get("/auth/github/login")
async def github_login(request: Request):
    if "github" not in oauth:
        raise HTTPException(status_code=500, detail="GitHub OAuth is not configured.")

    return await oauth.github.authorize_redirect(request, config.GITHUB_REDIRECT_URI)


@router.get("/auth/github/callback")
async def github_callback(request: Request):
    try:
        token = await oauth.github.authorize_access_token(request)
        profile_response = await oauth.github.get("user", token=token)
        profile = profile_response.json()

        email = profile.get("email")

        if not email:
            email_response = await oauth.github.get("user/emails", token=token)
            emails = email_response.json()
            primary = next(
                (item for item in emails if item.get("primary") and item.get("verified")),
                None,
            )
            email = primary.get("email") if primary else None

        user = create_or_get_oauth_user(
            provider="github",
            provider_id=str(profile.get("id")),
            email=email,
            username=profile.get("name") or profile.get("login"),
            avatar_url=profile.get("avatar_url"),
        )

        return redirect_with_login_result(user)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"GitHub login failed: {error}") from error


@router.get("/auth/discord/login")
async def discord_login(request: Request):
    if not config.DISCORD_CLIENT_ID or not config.DISCORD_CLIENT_SECRET or not config.DISCORD_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Discord OAuth is not configured.")

    return await oauth.discord.authorize_redirect(request, config.DISCORD_REDIRECT_URI)

@router.get("/auth/discord/callback")
async def discord_callback(request: Request):
    try:
        token = await oauth.discord.authorize_access_token(request)
        profile_response = await oauth.discord.get("users/@me", token=token)
        profile = profile_response.json()

        discord_id = str(profile.get("id"))
        avatar_hash = profile.get("avatar")
        avatar_url = ""

        if discord_id and avatar_hash:
            avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"

        user = create_or_get_oauth_user(
            provider="discord",
            provider_id=discord_id,
            email=profile.get("email"),
            username=profile.get("global_name") or profile.get("username"),
            avatar_url=avatar_url,
        )

        return redirect_with_login_result(user)
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Discord login failed: {error}") from error


@router.get("/auth/me")
def me(authorization: str | None = Header(default=None)):
    user = get_current_user_from_header(authorization)
    return {"user": public_user(user)}


@router.post("/auth/2fa/setup")
def setup_2fa(authorization: str | None = Header(default=None)):
    user = get_current_user_from_header(authorization)

    if user.get("twofa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled.")

    secret = pyotp.random_base32()
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(
        name=user.get("email") or user.get("username") or str(user.get("id")),
        issuer_name="Project Eden",
    )

    with get_auth_connection() as conn:
        conn.execute(
            "UPDATE users SET twofa_secret = ?, updated_at = ? WHERE id = ?",
            (secret, now_iso(), str(user["id"])),
        )
        conn.commit()

    return {
        "secret": secret,
        "otpauth_url": otpauth_url,
        "message": "Scan the otpauth_url with an authenticator app, then verify setup.",
    }


@router.post("/auth/2fa/verify-setup")
def verify_2fa_setup(
    body: TwoFactorSetupVerifyRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user_from_header(authorization)
    secret = user.get("twofa_secret")

    if not secret:
        raise HTTPException(status_code=400, detail="2FA setup has not been started.")

    if not pyotp.TOTP(secret).verify(body.code.replace(" ", "").strip(), valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid 2FA code.")

    backup_codes = create_backup_codes()

    with get_auth_connection() as conn:
        conn.execute(
            """
            UPDATE users
            SET twofa_enabled = 1,
                backup_codes_json = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (json.dumps(backup_codes), now_iso(), str(user["id"])),
        )
        conn.commit()

    return {
        "status": "enabled",
        "backup_codes": backup_codes,
        "message": "Save these backup codes now. They will not be shown again unless regenerated.",
    }


@router.post("/auth/2fa/disable")
def disable_2fa(
    body: TwoFactorDisableRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user_from_header(authorization)

    if not user.get("twofa_enabled"):
        return {"status": "already_disabled"}

    if not verify_totp_or_backup_code(user, body.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")

    with get_auth_connection() as conn:
        conn.execute(
            """
            UPDATE users
            SET twofa_enabled = 0,
                twofa_secret = NULL,
                backup_codes_json = NULL,
                updated_at = ?
            WHERE id = ?
            """,
            (now_iso(), str(user["id"])),
        )
        conn.commit()

    return {"status": "disabled"}


@router.post("/auth/2fa/backup-codes")
def refresh_backup_codes(
    body: BackupCodesRefreshRequest,
    authorization: str | None = Header(default=None),
):
    user = get_current_user_from_header(authorization)

    if not user.get("twofa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled.")

    if not verify_totp_or_backup_code(user, body.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code.")

    backup_codes = create_backup_codes()
    set_backup_codes(user["id"], backup_codes)

    return {
        "status": "regenerated",
        "backup_codes": backup_codes,
        "message": "Save these backup codes now. Older backup codes were invalidated.",
    }
