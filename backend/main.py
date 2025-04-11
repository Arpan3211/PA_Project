from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os
from jose import jwt

# Import settings directly
class Settings:
    API_V1_STR = "/api/v1"
    PROJECT_NAME = "AI Assistant API"
    CORS_ORIGINS = ["http://localhost:5500", "http://127.0.0.1:5500"]
    SECRET_KEY = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

settings = Settings()

# Create routers
api_router = APIRouter()
auth_router = APIRouter()
chat_router = APIRouter()

# Define schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

class MessageBase(BaseModel):
    content: str
    role: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None

class ChatResponse(BaseModel):
    message: str
    conversation_id: int

# In-memory database
users_db = {}
conversations_db = {}
messages_db = {}
next_user_id = 1
next_conversation_id = 1
next_message_id = 1

# Load data from JSON files if they exist
def load_data():
    global users_db, conversations_db, messages_db, next_user_id, next_conversation_id, next_message_id

    # Get the current directory (where main.py is located)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Define file paths
    users_file = os.path.join(current_dir, 'users.json')
    conversations_file = os.path.join(current_dir, 'conversations.json')
    messages_file = os.path.join(current_dir, 'messages.json')

    if os.path.exists(users_file):
        with open(users_file, 'r') as f:
            data = json.load(f)
            users_db = data['users']
            next_user_id = data['next_id']

    if os.path.exists(conversations_file):
        with open(conversations_file, 'r') as f:
            data = json.load(f)
            conversations_db = data['conversations']
            next_conversation_id = data['next_id']

    if os.path.exists(messages_file):
        with open(messages_file, 'r') as f:
            data = json.load(f)
            messages_db = data['messages']
            next_message_id = data['next_id']

# Save data to JSON files
def save_data():
    # Get the current directory (where main.py is located)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Define file paths
    users_file = os.path.join(current_dir, 'users.json')
    conversations_file = os.path.join(current_dir, 'conversations.json')
    messages_file = os.path.join(current_dir, 'messages.json')

    with open(users_file, 'w') as f:
        json.dump({'users': users_db, 'next_id': next_user_id}, f)

    with open(conversations_file, 'w') as f:
        json.dump({'conversations': conversations_db, 'next_id': next_conversation_id}, f)

    with open(messages_file, 'w') as f:
        json.dump({'messages': messages_db, 'next_id': next_message_id}, f)

# Try to load data
try:
    load_data()
except Exception as e:
    print(f"Error loading data: {e}")

# Authentication functions
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception

    user = users_db.get(str(user_id))
    if user is None:
        raise credentials_exception
    return user

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth endpoints
@auth_router.post("/register", response_model=User)
def register(user: UserCreate):
    global next_user_id

    # Check if username already exists
    for user_id, existing_user in users_db.items():
        if existing_user["username"] == user.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

    # Check if email already exists
    for user_id, existing_user in users_db.items():
        if existing_user["email"] == user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Create new user
    user_id = str(next_user_id)
    users_db[user_id] = {
        "id": next_user_id,
        "username": user.username,
        "email": user.email,
        "password": user.password  # In a real app, hash this password
    }
    next_user_id += 1

    # Save data
    save_data()

    return {
        "id": int(user_id),
        "username": user.username,
        "email": user.email
    }

@auth_router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Find user by username
    user = None
    user_id = None
    for uid, u in users_db.items():
        if u["username"] == form_data.username:
            user = u
            user_id = uid
            break

    # Check credentials
    if not user or user["password"] != form_data.password:  # In a real app, verify hashed password
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

@auth_router.get("/me", response_model=User)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "email": current_user["email"]
    }

# Chat endpoints
@chat_router.post("/", response_model=ChatResponse)
def chat(chat_request: ChatRequest, current_user: dict = Depends(get_current_user)):
    global next_conversation_id, next_message_id

    # Get or create conversation
    conversation_id = None
    if chat_request.conversation_id:
        # Check if conversation exists and belongs to user
        conv_id = str(chat_request.conversation_id)
        if conv_id in conversations_db and conversations_db[conv_id]["user_id"] == current_user["id"]:
            conversation_id = conv_id
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    else:
        # Create a new conversation
        title = chat_request.message[:30] + "..." if len(chat_request.message) > 30 else chat_request.message
        conversation_id = str(next_conversation_id)
        conversations_db[conversation_id] = {
            "id": next_conversation_id,
            "title": title,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        next_conversation_id += 1

    # Add user message
    message_id = str(next_message_id)
    messages_db[message_id] = {
        "id": next_message_id,
        "content": chat_request.message,
        "role": "user",
        "conversation_id": int(conversation_id),
        "created_at": datetime.utcnow().isoformat()
    }
    next_message_id += 1

    # Generate AI response (simple echo for now)
    ai_response = f"You said: {chat_request.message}"

    # Add AI message
    message_id = str(next_message_id)
    messages_db[message_id] = {
        "id": next_message_id,
        "content": ai_response,
        "role": "assistant",
        "conversation_id": int(conversation_id),
        "created_at": datetime.utcnow().isoformat()
    }
    next_message_id += 1

    # Update conversation timestamp
    conversations_db[conversation_id]["updated_at"] = datetime.utcnow().isoformat()

    # Save data
    save_data()

    return {
        "message": ai_response,
        "conversation_id": int(conversation_id)
    }

@chat_router.get("/conversations", response_model=Dict[str, List[Dict[str, Any]]])
def get_conversations(current_user: dict = Depends(get_current_user)):
    # Get all conversations for the current user
    user_conversations = []
    for conv_id, conv in conversations_db.items():
        if conv["user_id"] == current_user["id"]:
            user_conversations.append({
                "id": conv["id"],
                "title": conv["title"],
                "created_at": conv["created_at"]
            })

    # Sort by updated_at (newest first)
    user_conversations.sort(key=lambda x: conversations_db[str(x["id"])]["updated_at"], reverse=True)

    return {"conversations": user_conversations}

@chat_router.get("/history/{conversation_id}", response_model=Dict[str, List[Dict[str, str]]])
def get_conversation_history(conversation_id: int, current_user: dict = Depends(get_current_user)):
    # Check if conversation exists and belongs to user
    conv_id = str(conversation_id)
    if conv_id not in conversations_db or conversations_db[conv_id]["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Get all messages for the conversation
    conversation_messages = []
    for msg_id, msg in messages_db.items():
        if msg["conversation_id"] == conversation_id:
            conversation_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Sort by created_at
    conversation_messages.sort(key=lambda x: next(
        msg["created_at"] for msg_id, msg in messages_db.items()
        if msg["role"] == x["role"] and msg["content"] == x["content"]
    ))

    return {"messages": conversation_messages}

# Include routers
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(chat_router, prefix="/chat", tags=["chat"])

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Welcome to AI Assistant API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
