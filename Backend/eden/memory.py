

from typing import List, Optional, Dict
import json
import sqlite3
from pathlib import Path
from datetime import datetime

from .database import get_connection, init_db
from .logger import log_event
from .config import config

# Initialize database on import
init_db()


def save_message(session_id: str, role: str, content: str):
    """Save a user or assistant message"""
    conn = get_connection()
    conn.execute(
        "INSERT INTO memory (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()
    log_event("memory_saved", {"session_id": session_id, "role": role, "length": len(content)})


def save_memory(session_id: str, content: str, tags: Optional[List[str]] = None):
    """Save structured memory with optional tags"""
    tag_str = json.dumps(tags) if tags else None
    
    conn = get_connection()
    conn.execute(
        "INSERT INTO memory (session_id, role, content, tags) VALUES (?, ?, ?, ?)",
        (session_id, "memory", content, tag_str)
    )
    conn.commit()
    conn.close()
    
    log_event("structured_memory_saved", {
        "session_id": session_id,
        "tags": tags or []
    })


def search_memory(query: str, limit: int = 5) -> List[Dict]:
    """Search memory by content"""
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT id, session_id, role, content, tags, created_at 
        FROM memory 
        WHERE content LIKE ? 
        ORDER BY created_at DESC 
        LIMIT ?
        """,
        (f"%{query}%", limit)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results


def get_recent_conversation(session_id: str, limit: int = 20) -> List[Dict]:
    """Get recent conversation history for a session"""
    conn = get_connection()
    cursor = conn.execute(
        """
        SELECT role, content, created_at 
        FROM memory 
        WHERE session_id = ? 
        ORDER BY created_at ASC 
        LIMIT ?
        """,
        (session_id, limit)
    )
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results
