import ipaddress
from urllib.parse import urlparse
from .config import config

def is_private_ip(hostname: str) -> bool:
    try:
        ip = ipaddress.ip_address(hostname)
        return ip.is_private or ip.is_loopback
    except ValueError:
        return False

def validate_url(url: str) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    if parsed.hostname in (None, "localhost", "127.0.0.1", "::1"):
        return False
    if is_private_ip(parsed.hostname or ""):
        return False
    return True

def sanitize_user_input(text: str) -> str:
    return text.strip()[:4000]
