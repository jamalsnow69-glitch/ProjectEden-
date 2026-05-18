import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()


def get_message_text(messages):
    for message in reversed(messages):
        if message.get("role") == "user":
            return message.get("content", "")
    return ""


def stream_language_core(messages):
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    if groq_key:
        yield from stream_groq(messages, groq_key)
        return

    user_text = get_message_text(messages)
    yield "Eden language core is online, but GROQ_API_KEY is missing. "
    yield f"You said: {user_text}"


def stream_groq(messages, api_key):
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 700,
            "stream": True,
        },
        stream=True,
        timeout=60,
    )

    if response.status_code >= 400:
        yield f"Groq error {response.status_code}: {response.text}"
        return

    for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue

        payload = line.replace("data: ", "").strip()

        if payload == "[DONE]":
            break

        try:
            data = json.loads(payload)
            chunk = data["choices"][0]["delta"].get("content", "")
            if chunk:
                yield chunk
        except Exception:
            continue
