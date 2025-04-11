from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class MessageBase(BaseModel):
    content: str
    role: str


class MessageCreate(MessageBase):
    pass


class Message(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        orm_mode = True


class ConversationBase(BaseModel):
    title: str


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None


class Conversation(ConversationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[Message] = []

    class Config:
        orm_mode = True


class ConversationList(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        orm_mode = True


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    message: str
    conversation_id: int
