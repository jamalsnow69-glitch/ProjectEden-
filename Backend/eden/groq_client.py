from groq import Groq

from eden.config import config


def groq_available() -> bool:
    return bool(getattr(config, "GROQ_API_KEY", ""))


def ask_groq(
    messages: list[dict],
    temperature: float = 0.5,
    max_tokens: int = 500,
) -> str:
    if not groq_available():
        return ""

    client = Groq(api_key=config.GROQ_API_KEY)

    completion = client.chat.completions.create(
        model=config.GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return completion.choices[0].message.content.strip()
