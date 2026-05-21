import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text

# IMPORTANT:
# Change this import to match your actual auth dependency.
# It should return the currently logged-in user from the Bearer token.
from eden.auth import get_current_user


DEFAULT_PROFILE_PIC = "/logos/UCNMVC-LOGO.png"

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

router = APIRouter()


class ProfileUpdate(BaseModel):
    username: str | None = None
    profile_picture_url: str | None = None


class DemoCheckoutRequest(BaseModel):
    plan_id: str


ALLOWED_PLANS = {"free", "go", "plus", "pro", "premium", "family"}


def utc_now():
    return datetime.now(timezone.utc)


def make_account_id():
    return f"EDN-{secrets.token_hex(4).upper()}"


def normalize_user(current_user: Any) -> Dict[str, str]:
    """
    Accepts dict-like users from your auth system.
    Adjust this if your auth returns a Pydantic model/object.
    """
    if isinstance(current_user, dict):
        user_key = str(
            current_user.get("id")
            or current_user.get("sub")
            or current_user.get("email")
            or ""
        )
        email = str(current_user.get("email") or "")
        username = str(current_user.get("username") or current_user.get("name") or email.split("@")[0] or "User")
        avatar_url = str(current_user.get("avatar_url") or current_user.get("picture") or DEFAULT_PROFILE_PIC)
    else:
        user_key = str(
            getattr(current_user, "id", None)
            or getattr(current_user, "sub", None)
            or getattr(current_user, "email", None)
            or ""
        )
        email = str(getattr(current_user, "email", "") or "")
        username = str(getattr(current_user, "username", None) or getattr(current_user, "name", None) or email.split("@")[0] or "User")
        avatar_url = str(getattr(current_user, "avatar_url", None) or getattr(current_user, "picture", None) or DEFAULT_PROFILE_PIC)

    if not user_key:
        raise HTTPException(status_code=401, detail="Invalid authenticated user.")

    return {
        "user_key": user_key,
        "email": email,
        "username": username,
        "avatar_url": avatar_url or DEFAULT_PROFILE_PIC,
    }


def init_account_tables():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS eden_accounts (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_key TEXT UNIQUE NOT NULL,
                    account_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    email TEXT,
                    profile_picture_url TEXT NOT NULL DEFAULT '/logos/UCNMVC-LOGO.png',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS eden_subscriptions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_key TEXT UNIQUE NOT NULL REFERENCES eden_accounts(user_key) ON DELETE CASCADE,
                    plan TEXT NOT NULL DEFAULT 'free',
                    status TEXT NOT NULL DEFAULT 'active',
                    provider TEXT NOT NULL DEFAULT 'demo',
                    demo_payment_id TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
                """
            )
        )


def get_or_create_account(current_user: Any):
    user = normalize_user(current_user)

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT * FROM eden_accounts WHERE user_key = :user_key"),
            {"user_key": user["user_key"]},
        ).mappings().first()

        if not existing:
            account_id = make_account_id()

            conn.execute(
                text(
                    """
                    INSERT INTO eden_accounts (
                        user_key,
                        account_id,
                        username,
                        email,
                        profile_picture_url
                    )
                    VALUES (
                        :user_key,
                        :account_id,
                        :username,
                        :email,
                        :profile_picture_url
                    );
                    """
                ),
                {
                    "user_key": user["user_key"],
                    "account_id": account_id,
                    "username": user["username"],
                    "email": user["email"],
                    "profile_picture_url": user["avatar_url"] or DEFAULT_PROFILE_PIC,
                },
            )

            conn.execute(
                text(
                    """
                    INSERT INTO eden_subscriptions (
                        user_key,
                        plan,
                        status,
                        provider
                    )
                    VALUES (
                        :user_key,
                        'free',
                        'active',
                        'demo'
                    )
                    ON CONFLICT (user_key) DO NOTHING;
                    """
                ),
                {"user_key": user["user_key"]},
            )

        account = conn.execute(
            text("SELECT * FROM eden_accounts WHERE user_key = :user_key"),
            {"user_key": user["user_key"]},
        ).mappings().first()

        subscription = conn.execute(
            text("SELECT * FROM eden_subscriptions WHERE user_key = :user_key"),
            {"user_key": user["user_key"]},
        ).mappings().first()

        if not subscription:
            conn.execute(
                text(
                    """
                    INSERT INTO eden_subscriptions (
                        user_key,
                        plan,
                        status,
                        provider
                    )
                    VALUES (
                        :user_key,
                        'free',
                        'active',
                        'demo'
                    );
                    """
                ),
                {"user_key": user["user_key"]},
            )

            subscription = conn.execute(
                text("SELECT * FROM eden_subscriptions WHERE user_key = :user_key"),
                {"user_key": user["user_key"]},
            ).mappings().first()

        return dict(account), dict(subscription)


@router.get("/account/me")
def account_me(current_user: Any = Depends(get_current_user)):
    account, subscription = get_or_create_account(current_user)

    return {
        "account": {
            "account_id": account["account_id"],
            "username": account["username"],
            "email": account["email"],
            "profile_picture_url": account["profile_picture_url"] or DEFAULT_PROFILE_PIC,
            "created_at": str(account["created_at"]),
        },
        "subscription": {
            "plan": subscription["plan"],
            "status": subscription["status"],
            "provider": subscription["provider"],
            "updated_at": str(subscription["updated_at"]),
        },
    }


@router.patch("/account/me")
def update_account(payload: ProfileUpdate, current_user: Any = Depends(get_current_user)):
    account, _ = get_or_create_account(current_user)

    username = payload.username if payload.username is not None else account["username"]
    profile_picture_url = payload.profile_picture_url if payload.profile_picture_url is not None else account["profile_picture_url"]

    if not profile_picture_url:
        profile_picture_url = DEFAULT_PROFILE_PIC

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE eden_accounts
                SET username = :username,
                    profile_picture_url = :profile_picture_url,
                    updated_at = NOW()
                WHERE user_key = :user_key;
                """
            ),
            {
                "user_key": account["user_key"],
                "username": username,
                "profile_picture_url": profile_picture_url,
            },
        )

    account, subscription = get_or_create_account(current_user)

    return {
        "account": {
            "account_id": account["account_id"],
            "username": account["username"],
            "email": account["email"],
            "profile_picture_url": account["profile_picture_url"] or DEFAULT_PROFILE_PIC,
        },
        "subscription": {
            "plan": subscription["plan"],
            "status": subscription["status"],
        },
    }


@router.get("/subscriptions/me")
def subscription_me(current_user: Any = Depends(get_current_user)):
    account, subscription = get_or_create_account(current_user)

    return {
        "account_id": account["account_id"],
        "plan": subscription["plan"],
        "status": subscription["status"],
        "provider": subscription["provider"],
        "updated_at": str(subscription["updated_at"]),
    }


@router.post("/subscriptions/demo-checkout")
def demo_checkout(payload: DemoCheckoutRequest, current_user: Any = Depends(get_current_user)):
    if payload.plan_id not in ALLOWED_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan.")

    if payload.plan_id == "free":
        raise HTTPException(status_code=400, detail="Free plan does not need checkout.")

    account, _ = get_or_create_account(current_user)
    demo_payment_id = f"demo_{secrets.token_hex(8)}"

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE eden_subscriptions
                SET plan = :plan,
                    status = 'active',
                    provider = 'demo',
                    demo_payment_id = :demo_payment_id,
                    updated_at = NOW()
                WHERE user_key = :user_key;
                """
            ),
            {
                "user_key": account["user_key"],
                "plan": payload.plan_id,
                "demo_payment_id": demo_payment_id,
            },
        )

    return {
        "ok": True,
        "message": "Demo payment approved.",
        "plan": payload.plan_id,
        "status": "active",
        "provider": "demo",
        "demo_payment_id": demo_payment_id,
    }


@router.post("/subscriptions/cancel")
def cancel_subscription(current_user: Any = Depends(get_current_user)):
    account, _ = get_or_create_account(current_user)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE eden_subscriptions
                SET plan = 'free',
                    status = 'cancelled',
                    provider = 'demo',
                    updated_at = NOW()
                WHERE user_key = :user_key;
                """
            ),
            {"user_key": account["user_key"]},
        )

    return {
        "ok": True,
        "message": "Subscription cancelled. Account returned to Free.",
        "plan": "free",
        "status": "cancelled",
    }
