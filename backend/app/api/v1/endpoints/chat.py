from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import (
    ConversationList, Conversation as ConversationSchema,
    ChatRequest, ChatResponse
)

router = APIRouter()


@router.post("/", response_model=ChatResponse)
def chat(
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the AI assistant
    """
    # Get or create conversation
    if chat_request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == chat_request.conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    else:
        # Create a new conversation with the first few words as the title
        title = chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message
        conversation = Conversation(title=title, user_id=current_user.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Add user message to conversation
    user_message = Message(
        content=chat_request.message,
        role="user",
        conversation_id=conversation.id
    )
    db.add(user_message)
    db.commit()
    
    # Generate AI response (simple echo for now)
    ai_response = f"You said: {chat_request.message}"
    
    # Add AI message to conversation
    ai_message = Message(
        content=ai_response,
        role="assistant",
        conversation_id=conversation.id
    )
    db.add(ai_message)
    db.commit()
    
    return {
        "message": ai_response,
        "conversation_id": conversation.id
    }


@router.get("/conversations", response_model={"conversations": List[ConversationList]})
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all conversations for the current user
    """
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    
    return {"conversations": conversations}


@router.get("/history/{conversation_id}", response_model={"messages": List[dict]})
def get_conversation_history(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversation history
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    
    return {
        "messages": [
            {"role": msg.role, "content": msg.content} for msg in messages
        ]
    }
