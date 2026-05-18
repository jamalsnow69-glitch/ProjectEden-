"""
Project Eden - Tool Router
Responsible for deciding which tools Eden should use based on user intent.
"""

from typing import List
from .brain import detect_intent
from .logger import log_event


def decide_tools(message: str) -> List[str]:
    """
    Main tool routing logic.
    Returns a list of tools that should be activated for this message.
    """
    intent = detect_intent(message)
    tools: List[str] = []

    message_lower = message.lower()

    # Intent-based routing
    if intent == "web_search":
        tools.append("web_search")

    # Additional keyword-based detection for better accuracy
    if any(keyword in message_lower for keyword in [
        "search for", "search the web", "find information", 
        "what is", "who is", "latest news", "look up"
    ]):
        if "web_search" not in tools:
            tools.append("web_search")

    # Webpage reading detection
    if any(keyword in message_lower for keyword in [
        "read this page", "read the url", "visit", "browse", 
        "summarize this article", "extract from", "go to url"
    ]):
        tools.append("read_url")

    # Memory-related requests
    if any(keyword in message_lower for keyword in [
        "remember", "recall", "what did i say", "my previous message",
        "search memory", "find in memory"
    ]):
        tools.append("memory_search")

    # Training related (rare, but protected)
    if any(keyword in message_lower for keyword in [
        "add to training", "approve this", "save as example"
    ]):
        tools.append("training")

    log_event("tool_routing", {
        "message_preview": message[:80],
        "intent": intent,
        "tools_decided": tools
    })

    return tools


def should_use_memory(message: str) -> bool:
    """Determine if we should pull memory for this request"""
    message_lower = message.lower()
    return any(word in message_lower for word in [
        "remember", "recall", "earlier", "before", "last time",
        "conversation", "we talked"
    ])


def should_search_web(message: str) -> bool:
    """Simple heuristic for web search need"""
    return any(keyword in message.lower() for keyword in [
        "search", "google", "latest", "current", "news", 
        "what is", "who is", "how many", "when did"
    ])
