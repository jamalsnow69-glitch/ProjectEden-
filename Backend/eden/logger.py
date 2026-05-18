import logging
import json
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("eden")

def log_event(event_type: str, data: dict):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": event_type,
        **data
    }
    logger.info(json.dumps(entry, default=str))
