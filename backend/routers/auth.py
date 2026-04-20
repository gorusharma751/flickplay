from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import jwt
import os
from database import get_db, hash_password, verify_password

router = APIRouter()
SECRET_KEY = os.getenv("SECRET_KEY", "flickplay-secret-key-change-in-production")
ALGORITHM = "HS256"

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

def create_jwt(user_id: int, email: str, plan: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "plan": plan,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    return decode_jwt(token)

@router.post("/register")
async def register(req: RegisterRequest):
    db = await get_db()
    try:
        existing = await db.execute("SELECT id FROM users WHERE email = ?", (req.email,))
        if await existing.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        pwd_hash = hash_password(req.password)
        cursor = await db.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (req.email, pwd_hash, req.name)
        )
        await db.commit()
        user_id = cursor.lastrowid
        token = create_jwt(user_id, req.email, "free")
        return {"token": token, "user": {"id": user_id, "email": req.email, "name": req.name, "plan": "free"}}
    finally:
        await db.close()

@router.post("/login")
async def login(req: LoginRequest):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id, email, name, password_hash, plan, telegram_joined FROM users WHERE email = ?", (req.email,))
        user = await cursor.fetchone()
        if not user or not verify_password(req.password, user[3]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not user: raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_jwt(user[0], user[1], user[4])
        return {
            "token": token,
            "user": {"id": user[0], "email": user[1], "name": user[2], "plan": user[4], "telegram_joined": bool(user[5])}
        }
    finally:
        await db.close()

@router.get("/me")
async def get_me(authorization: str = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(authorization.replace("Bearer ", ""))
    db = await get_db()
    try:
        cursor = await db.execute("SELECT id, email, name, plan, telegram_joined FROM users WHERE id = ?", (payload["user_id"],))
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"id": user[0], "email": user[1], "name": user[2], "plan": user[3], "telegram_joined": bool(user[4])}
    finally:
        await db.close()

@router.post("/telegram-joined")
async def mark_telegram_joined(authorization: str = None):
    payload = decode_jwt((authorization or "").replace("Bearer ", ""))
    db = await get_db()
    try:
        await db.execute("UPDATE users SET telegram_joined = 1 WHERE id = ?", (payload["user_id"],))
        await db.commit()
        return {"success": True}
    finally:
        await db.close()
