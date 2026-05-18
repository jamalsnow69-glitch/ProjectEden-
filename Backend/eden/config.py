import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_PATH, override=True)


class Config:
    ENV: str = os.getenv("ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    DATABASE_PATH: str = os.getenv(
        "DATABASE_PATH",
        str(BACKEND_DIR / "data" / "memory.db"),
    )

    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "change-this-secret"
    )

    JWT_ALGORITHM: str = os.getenv(
        "JWT_ALGORITHM",
        "HS256"
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )

    FRONTEND_URL: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173"
    )

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv(
        "GOOGLE_CLIENT_ID",
        ""
    )

    GOOGLE_CLIENT_SECRET: str = os.getenv(
        "GOOGLE_CLIENT_SECRET",
        ""
    )

    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        ""
    )

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = os.getenv(
        "GITHUB_CLIENT_ID",
        ""
    )

    GITHUB_CLIENT_SECRET: str = os.getenv(
        "GITHUB_CLIENT_SECRET",
        ""
    )

    GITHUB_REDIRECT_URI: str = os.getenv(
        "GITHUB_REDIRECT_URI",
        ""
    )

    # Discord OAuth
    DISCORD_CLIENT_ID: str = os.getenv(
        "DISCORD_CLIENT_ID",
        ""
    )

    DISCORD_CLIENT_SECRET: str = os.getenv(
        "DISCORD_CLIENT_SECRET",
        ""
    )

    DISCORD_REDIRECT_URI: str = os.getenv(
        "DISCORD_REDIRECT_URI",
        ""
    )

    # AI Providers
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")


config = Config()
