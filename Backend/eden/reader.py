import requests
from bs4 import BeautifulSoup
from .safety import validate_url
from .config import config
from .logger import log_event

def read_url(url: str) -> dict:
    if not validate_url(url):
        raise ValueError("Invalid or dangerous URL blocked by safety layer.")

    headers = {"User-Agent": "Project-Eden/0.2 (Private AI Backend)"}

    try:
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        if len(response.content) > config.MAX_WEB_READ_CHARS * 3:
            raise ValueError("Response too large")

        soup = BeautifulSoup(response.text, "lxml")
        title = soup.title.string.strip() if soup.title else "Untitled"
        text = soup.get_text(separator=" ", strip=True)
        cleaned_text = " ".join(text.split())[:config.MAX_WEB_READ_CHARS]

        log_event("url_read_success", {"url": url, "title": title[:80]})

        return {
            "title": title,
            "url": url,
            "extracted_text": cleaned_text,
            "metadata": {"size": len(cleaned_text)}
        }
    except Exception as e:
        log_event("url_read_failed", {"url": url, "error": str(e)})
        raise
