from fastapi import APIRouter, HTTPException, Query
from database import get_db
import json

router = APIRouter()

@router.get("/")
async def list_videos(
    category: str = None,
    search: str = None,
    language: str = None,
    access: str = None,
    featured: bool = False,
    page: int = 1,
    limit: int = 20
):
    db = await get_db()
    try:
        conditions = ["v.is_active = 1", "v.is_series = 0"]
        params = []

        if category:
            conditions.append("v.category = ?")
            params.append(category)
        if language:
            conditions.append("v.language = ?")
            params.append(language)
        if access:
            conditions.append("v.access_level = ?")
            params.append(access)
        if featured:
            conditions.append("v.is_featured = 1")
        if search:
            conditions.append("(v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

        where = " AND ".join(conditions)
        offset = (page - 1) * limit

        cursor = await db.execute(
            f"""SELECT v.id, v.title, v.description, v.category, v.language,
                v.year, v.duration, v.quality, v.thumbnail_url, v.rating,
                v.access_level, v.total_parts, v.is_series, v.views, v.is_featured
                FROM videos v WHERE {where}
                ORDER BY v.is_featured DESC, v.created_at DESC
                LIMIT ? OFFSET ?""",
            params + [limit, offset]
        )
        rows = await cursor.fetchall()
        videos = []
        for r in rows:
            videos.append({
                "id": r[0], "title": r[1], "description": r[2],
                "category": r[3], "language": r[4], "year": r[5],
                "duration": r[6], "quality": r[7], "thumbnail_url": r[8],
                "rating": r[9], "access_level": r[10], "total_parts": r[11],
                "is_series": bool(r[12]), "views": r[13], "is_featured": bool(r[14])
            })

        count_cursor = await db.execute(f"SELECT COUNT(*) FROM videos v WHERE {where}", params)
        total = (await count_cursor.fetchone())[0]

        return {"videos": videos, "total": total, "page": page, "pages": (total + limit - 1) // limit}
    finally:
        await db.close()

@router.get("/featured")
async def get_featured():
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, title, description, category, thumbnail_url, rating,
               access_level, year, duration, quality, cast_info, director
               FROM videos WHERE is_featured = 1 AND is_active = 1 LIMIT 5"""
        )
        rows = await cursor.fetchall()
        return [{"id": r[0], "title": r[1], "description": r[2], "category": r[3],
                 "thumbnail_url": r[4], "rating": r[5], "access_level": r[6],
                 "year": r[7], "duration": r[8], "quality": r[9],
                 "cast": r[10], "director": r[11]} for r in rows]
    finally:
        await db.close()

@router.get("/categories")
async def get_categories():
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT DISTINCT category FROM videos WHERE is_active = 1 ORDER BY category"
        )
        rows = await cursor.fetchall()
        return [r[0] for r in rows]
    finally:
        await db.close()

@router.get("/search")
async def search_videos(q: str = Query(..., min_length=1)):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, title, category, thumbnail_url, access_level, year, quality, rating
               FROM videos WHERE is_active = 1 AND
               (title LIKE ? OR description LIKE ? OR tags LIKE ? OR cast_info LIKE ?)
               ORDER BY views DESC LIMIT 30""",
            (f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%")
        )
        rows = await cursor.fetchall()
        return [{"id": r[0], "title": r[1], "category": r[2], "thumbnail_url": r[3],
                 "access_level": r[4], "year": r[5], "quality": r[6], "rating": r[7]} for r in rows]
    finally:
        await db.close()

@router.get("/{video_id}")
async def get_video(video_id: int):
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT id, title, description, category, language, year, duration,
               quality, thumbnail_url, trailer_url, cast_info, director, rating,
               access_level, total_parts, is_series, season_number, views, tags, is_featured
               FROM videos WHERE id = ? AND is_active = 1""",
            (video_id,)
        )
        v = await cursor.fetchone()
        if not v:
            raise HTTPException(status_code=404, detail="Video not found")

        # Get parts
        parts_cursor = await db.execute(
            "SELECT id, part_number, title, duration, size_mb, quality FROM video_parts WHERE video_id = ? ORDER BY part_number",
            (video_id,)
        )
        parts = await parts_cursor.fetchall()

        # Increment views
        await db.execute("UPDATE videos SET views = views + 1 WHERE id = ?", (video_id,))
        await db.commit()

        return {
            "id": v[0], "title": v[1], "description": v[2], "category": v[3],
            "language": v[4], "year": v[5], "duration": v[6], "quality": v[7],
            "thumbnail_url": v[8], "trailer_url": v[9], "cast": v[10],
            "director": v[11], "rating": v[12], "access_level": v[13],
            "total_parts": v[14], "is_series": bool(v[15]), "season": v[16],
            "views": v[17], "tags": v[18], "is_featured": bool(v[19]),
            "parts": [{"id": p[0], "part_number": p[1], "title": p[2],
                       "duration": p[3], "size_mb": p[4], "quality": p[5]} for p in parts]
        }
    finally:
        await db.close()

@router.get("/{video_id}/related")
async def get_related(video_id: int):
    db = await get_db()
    try:
        cursor = await db.execute("SELECT category FROM videos WHERE id = ?", (video_id,))
        row = await cursor.fetchone()
        if not row:
            return []
        cursor = await db.execute(
            """SELECT id, title, thumbnail_url, access_level, rating FROM videos
               WHERE category = ? AND id != ? AND is_active = 1 LIMIT 8""",
            (row[0], video_id)
        )
        rows = await cursor.fetchall()
        return [{"id": r[0], "title": r[1], "thumbnail_url": r[2], "access_level": r[3], "rating": r[4]} for r in rows]
    finally:
        await db.close()
