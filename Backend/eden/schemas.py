from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"
    reasoning_level: Optional[str] = "balanced"
    memory_depth: Optional[str] = "standard"


class ChatResponse(BaseModel):
    response: str
    used_tools: List[str] = Field(default_factory=list)
    memory_used: List[str] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str = "web"


class SearchResponse(BaseModel):
    results: List[SearchResult] = Field(default_factory=list)


class ReadUrlRequest(BaseModel):
    url: str


class ReadUrlResponse(BaseModel):
    title: str = ""
    url: str
    extracted_text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemorySaveRequest(BaseModel):
    session_id: str
    content: str
    tags: Optional[List[str]] = None


class TrainingApprovalRequest(BaseModel):
    input_text: str
    output_text: str
    source: Optional[str] = None
    url: Optional[str] = None
    from_chat: bool = False
    from_memory: bool = False


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email_or_username: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    version: str
