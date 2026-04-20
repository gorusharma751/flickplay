from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
import jwt
import os
import hashlib
from database import get_db, hash_password

router = APIRouter()
SECRET_KEY = os.getenv("SECRET_KEY", "flickplay-secret-key-change-in-production")

def verify_admin(authorization: str):
    if not authorization:
        raise HTTPException(status_code=401, detail="Admin auth required")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access only")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

class AdminLogin(BaseModel):
    email: str
    password: str

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str
    subcategory: Optional[str] = ""
    language: str = "Hindi"
    year: Optional[int] = None
    duration: Optional[str] = ""
    quality: str = "HD"
    thumbnail_url: Optional[str] = ""
    trailer_url: Optional[str] = ""
    cast_info: Optional[str] = ""
    director: Optional[str] = ""
    rating: float = 0.0
    access_level: str = "free"
    total_parts: int = 1
    is_series: bool = False
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    parent_series_id: Optional[int] = None
    tags: Optional[str] = ""
    is_featured: bool = False

class PartCreate(BaseModel):
    video_id: int
    part_number: int
    title: Optional[str] = ""
    telegram_file_id: str
    duration: Optional[str] = ""
    size_mb: Optional[float] = None
    quality: str = "HD"

class SettingUpdate(BaseModel):
    key: str
    value: str

@router.post("/login")
async def admin_login(req: AdminLogin):
    db = await get_db()
    try:
        pwd_hash = hash_password(req.password)
        cursor = await db.execute(
            "SELECT id, email, name FROM admins WHERE email = ? AND password_hash = ?",
            (req.email, pwd_hash)
        )
        admin = await cursor.fetchone()
        if not admin:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        from datetime import datetime, timedelta
        payload = {"admin_id": admin[0], "email": admin[1], "name": admin[2], "role": "admin",
                   "exp": datetime.utcnow() + timedelta(days=7)}
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        return {"token": token, "admin": {"id": admin[0], "email": admin[1], "name": admin[2]}}
    finally:
        await db.close()

@router.get("/dashboard")
async def dashboard(authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        stats = {}
        for key, query in [
            ("total_videos", "SELECT COUNT(*) FROM videos WHERE is_active=1"),
            ("total_users", "SELECT COUNT(*) FROM users"),
            ("free_users", "SELECT COUNT(*) FROM users WHERE plan='free'"),
            ("pro_users", "SELECT COUNT(*) FROM users WHERE plan='pro'"),
            ("premium_users", "SELECT COUNT(*) FROM users WHERE plan='premium'"),
            ("total_views", "SELECT SUM(views) FROM videos"),
        ]:
            cursor = await db.execute(query)
            row = await cursor.fetchone()
            stats[key] = row[0] or 0
        return stats
    finally:
        await db.close()

@router.get("/videos")
async def admin_videos(page: int = 1, limit: int = 20, search: str = None, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        conditions = ["1=1"]
        params = []
        if search:
            conditions.append("(title LIKE ? OR category LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        where = " AND ".join(conditions)
        offset = (page - 1) * limit
        cursor = await db.execute(
            f"SELECT id, title, category, access_level, total_parts, is_active, is_featured, views, created_at FROM videos WHERE {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset]
        )
        rows = await cursor.fetchall()
        count_c = await db.execute(f"SELECT COUNT(*) FROM videos WHERE {where}", params)
        total = (await count_c.fetchone())[0]
        videos = [{"id": r[0], "title": r[1], "category": r[2], "access_level": r[3],
                   "total_parts": r[4], "is_active": bool(r[5]), "is_featured": bool(r[6]),
                   "views": r[7], "created_at": r[8]} for r in rows]
        return {"videos": videos, "total": total}
    finally:
        await db.close()

@router.post("/videos")
async def create_video(video: VideoCreate, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO videos (title, description, category, subcategory, language, year, duration,
               quality, thumbnail_url, trailer_url, cast_info, director, rating, access_level,
               total_parts, is_series, season_number, episode_number, parent_series_id, tags, is_featured)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (video.title, video.description, video.category, video.subcategory, video.language,
             video.year, video.duration, video.quality, video.thumbnail_url, video.trailer_url,
             video.cast_info, video.director, video.rating, video.access_level, video.total_parts,
             int(video.is_series), video.season_number, video.episode_number, video.parent_series_id,
             video.tags, int(video.is_featured))
        )
        await db.commit()
        return {"id": cursor.lastrowid, "message": "Video created successfully"}
    finally:
        await db.close()

@router.put("/videos/{video_id}")
async def update_video(video_id: int, video: VideoCreate, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        await db.execute(
            """UPDATE videos SET title=?, description=?, category=?, subcategory=?, language=?,
               year=?, duration=?, quality=?, thumbnail_url=?, trailer_url=?, cast_info=?,
               director=?, rating=?, access_level=?, total_parts=?, is_series=?, season_number=?,
               episode_number=?, parent_series_id=?, tags=?, is_featured=? WHERE id=?""",
            (video.title, video.description, video.category, video.subcategory, video.language,
             video.year, video.duration, video.quality, video.thumbnail_url, video.trailer_url,
             video.cast_info, video.director, video.rating, video.access_level, video.total_parts,
             int(video.is_series), video.season_number, video.episode_number, video.parent_series_id,
             video.tags, int(video.is_featured), video_id)
        )
        await db.commit()
        return {"message": "Video updated"}
    finally:
        await db.close()

@router.delete("/videos/{video_id}")
async def delete_video(video_id: int, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        await db.execute("UPDATE videos SET is_active = 0 WHERE id = ?", (video_id,))
        await db.commit()
        return {"message": "Video deleted"}
    finally:
        await db.close()

@router.post("/parts")
async def add_part(part: PartCreate, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO video_parts (video_id, part_number, title, telegram_file_id, duration, size_mb, quality) VALUES (?,?,?,?,?,?,?)",
            (part.video_id, part.part_number, part.title, part.telegram_file_id, part.duration, part.size_mb, part.quality)
        )
        await db.commit()
        return {"id": cursor.lastrowid, "message": "Part added"}
    finally:
        await db.close()

@router.get("/parts/{video_id}")
async def get_parts(video_id: int, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, part_number, title, telegram_file_id, duration, size_mb, quality FROM video_parts WHERE video_id = ? ORDER BY part_number",
            (video_id,)
        )
        rows = await cursor.fetchall()
        return [{"id": r[0], "part_number": r[1], "title": r[2], "telegram_file_id": r[3],
                 "duration": r[4], "size_mb": r[5], "quality": r[6]} for r in rows]
    finally:
        await db.close()

@router.delete("/parts/{part_id}")
async def delete_part(part_id: int, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        await db.execute("DELETE FROM video_parts WHERE id = ?", (part_id,))
        await db.commit()
        return {"message": "Part deleted"}
    finally:
        await db.close()

@router.get("/users")
async def get_users(page: int = 1, limit: int = 20, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        offset = (page - 1) * limit
        cursor = await db.execute(
            "SELECT id, email, name, plan, telegram_joined, created_at, is_active FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = await cursor.fetchall()
        count_c = await db.execute("SELECT COUNT(*) FROM users")
        total = (await count_c.fetchone())[0]
        return {
            "users": [{"id": r[0], "email": r[1], "name": r[2], "plan": r[3],
                       "telegram_joined": bool(r[4]), "created_at": r[5], "is_active": bool(r[6])} for r in rows],
            "total": total
        }
    finally:
        await db.close()

@router.put("/users/{user_id}/plan")
async def update_user_plan(user_id: int, plan: dict, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        await db.execute("UPDATE users SET plan = ? WHERE id = ?", (plan["plan"], user_id))
        await db.commit()
        return {"message": "Plan updated"}
    finally:
        await db.close()

@router.get("/settings")
async def get_settings(authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        cursor = await db.execute("SELECT key, value FROM app_settings")
        rows = await cursor.fetchall()
        return {r[0]: r[1] for r in rows}
    finally:
        await db.close()

@router.post("/settings")
async def update_setting(setting: SettingUpdate, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        await db.execute(
            "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (setting.key, setting.value)
        )
        await db.commit()
        return {"message": "Setting updated"}
    finally:
        await db.close()

@router.post("/settings/bulk")
async def bulk_update_settings(settings: dict, authorization: str = Header(None)):
    verify_admin(authorization)
    db = await get_db()
    try:
        for key, value in settings.items():
            await db.execute(
                "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                (key, str(value))
            )
        await db.commit()
        return {"message": "Settings updated"}
    finally:
        await db.close()
