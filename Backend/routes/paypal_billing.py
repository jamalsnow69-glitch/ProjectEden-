import os
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from eden.auth import get_current_user

router = APIRouter(prefix="/billing/paypal", tags=["PayPal Billing"])

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "")
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://nmvc.online").rstrip("/")

PAYPAL_PLAN_IDS = {
    "pro": os.getenv("PAYPAL_PRO_PLAN_ID", ""),
    "premium": os.getenv("PAYPAL_PREMIUM_PLAN_ID", ""),
    "family": os.getenv("PAYPAL_FAMILY_PLAN_ID", ""),
}

PAYPAL_BASE_URL = (
    "https://api-m.sandbox.paypal.com"
    if PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)


class CreateSubscriptionRequest(BaseModel):
    plan_id: str


async def get_paypal_access_token() -> str:
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PayPal credentials are missing.")

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            headers={"Accept": "application/json"},
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Could not get PayPal access token.")

    data = response.json()
    token = data.get("access_token")

    if not token:
        raise HTTPException(status_code=502, detail="PayPal did not return an access token.")

    return token


@router.post("/create-subscription")
async def create_paypal_subscription(
    payload: CreateSubscriptionRequest,
    current_user: Any = Depends(get_current_user),
):
    plan_key = payload.plan_id.lower().strip()
    paypal_plan_id = PAYPAL_PLAN_IDS.get(plan_key)

    if not paypal_plan_id:
        raise HTTPException(status_code=400, detail="Invalid or unavailable PayPal plan.")

    access_token = await get_paypal_access_token()

    user_email = ""
    if isinstance(current_user, dict):
        user_email = current_user.get("email", "")

    body = {
        "plan_id": paypal_plan_id,
        "custom_id": user_email or str(current_user),
        "application_context": {
            "brand_name": "Project Eden",
            "locale": "en-US",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "return_url": f"{FRONTEND_URL}/billing/success?provider=paypal&plan={plan_key}",
            "cancel_url": f"{FRONTEND_URL}/billing/cancel?provider=paypal",
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v1/billing/subscriptions",
            json=body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=response.text)

    data = response.json()
    approval_url = None

    for link in data.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break

    if not approval_url:
        raise HTTPException(status_code=502, detail="PayPal approval URL missing.")

    return {
        "ok": True,
        "provider": "paypal",
        "plan": plan_key,
        "paypal_subscription_id": data.get("id"),
        "approval_url": approval_url,
    }


@router.post("/webhook")
async def paypal_webhook(event: dict):
    event_type = event.get("event_type")
    resource = event.get("resource", {})

    return {
        "ok": True,
        "received": event_type,
        "resource_id": resource.get("id"),
    }
