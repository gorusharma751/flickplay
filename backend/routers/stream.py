from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, Response
import httpx
import os
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from database import get_db
from routers.auth import decode_jwt

router = APIRouter()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
STREAM_SECRET = os.getenv("STREAM_SECRET", "flickplay-stream-secret")

def generate_stream_token(video_id: int, part_id: int, user_id: int, expires_in: int = 3600) -> str:
    expiry = int(time.time()) + expires_in
    data = f"{video_id}:{part_id}:{user_id}:{expiry}"
    sig = hmac.new(STREAM_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}:{sig}"

def verify_stream_token(token: str) -> dict:
    try:
        parts = token.rsplit(":", 1)
        if len(parts) != 2:
            raise ValueError("Invalid token format")
        data, sig = parts
        expected_sig = hmac.new(STREAM_SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            raise ValueError("Invalid signature")
        video_id, part_id, user_id, expiry = data.split(":")
        if int(expiry) < int(time.time()):
            raise ValueError("Token expired")
        return {"video_id": int(video_id), "part_id": int(part_id), "user_id": int(user_id)}
    except Exception as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/token/{video_id}/{part_id}")
async def get_stream_token(video_id: int, part_id: int, authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(authorization.replace("Bearer ", ""))
    user_id = payload["user_id"]
    user_plan = payload["plan"]

    db = await get_db()
    try:
        # Check video access level
        v_cursor = await db.execute("SELECT access_level FROM videos WHERE id = ? AND is_active = 1", (video_id,))
        video = await v_cursor.fetchone()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        access_level = video[0]
        plan_levels = {"free": 0, "pro": 1, "premium": 2}
        access_needed = {"free": 0, "pro": 1, "premium": 2}

        if plan_levels.get(user_plan, 0) < access_needed.get(access_level, 0):
            raise HTTPException(status_code=403, detail="Upgrade plan to watch this content")

        # Verify part exists
        p_cursor = await db.execute("SELECT id FROM video_parts WHERE id = ? AND video_id = ?", (part_id, video_id))
        part = await p_cursor.fetchone()
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")

        token = generate_stream_token(video_id, part_id, user_id)
        return {"stream_token": token, "expires_in": 3600}
    finally:
        await db.close()

@router.get("/watch/{stream_token}")
async def stream_video(stream_token: str, request: Request):
    token_data = verify_stream_token(stream_token)
    part_id = token_data["part_id"]

    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT telegram_file_id FROM video_parts WHERE id = ?", (part_id,)
        )
        part = await cursor.fetchone()
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")

        telegram_file_id = part[0]

        # Get file path from Telegram
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile",
                params={"file_id": telegram_file_id}
            )
            file_data = resp.json()
            if not file_data.get("ok"):
                raise HTTPException(status_code=500, detail="Failed to get file from Telegram")

            file_path = file_data["result"]["file_path"]
            file_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"

            # Handle range requests for video seeking
            range_header = request.headers.get("range")
            headers = {}
            if range_header:
                headers["Range"] = range_header

            tg_response = await client.get(file_url, headers=headers, follow_redirects=True)

            content_type = tg_response.headers.get("content-type", "video/mp4")
            response_headers = {
                "Content-Type": content_type,
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "default-src 'none'",
                "X-Frame-Options": "SAMEORIGIN",
                # Anti-screen-record signals
                "X-Robots-Tag": "noindex, noarchive",
            }

            if "content-length" in tg_response.headers:
                response_headers["Content-Length"] = tg_response.headers["content-length"]
            if "content-range" in tg_response.headers:
                response_headers["Content-Range"] = tg_response.headers["content-range"]

            status_code = 206 if range_header else 200

            async def iter_content():
                async for chunk in tg_response.aiter_bytes(chunk_size=65536):
                    yield chunk

            return StreamingResponse(iter_content(), status_code=status_code, headers=response_headers)
    finally:
        await db.close()

@router.get("/download/{stream_token}")
async def download_video(stream_token: str):
    token_data = verify_stream_token(stream_token)
    part_id = token_data["part_id"]
    user_id = token_data["user_id"]

    db = await get_db()
    try:
        # Only premium users can download
        u_cursor = await db.execute("SELECT plan FROM users WHERE id = ?", (user_id,))
        user = await u_cursor.fetchone()
        if not user or user[0] != "premium":
            raise HTTPException(status_code=403, detail="Premium plan required for downloads")

        cursor = await db.execute(
            "SELECT telegram_file_id, title FROM video_parts vp JOIN videos v ON vp.video_id = v.id WHERE vp.id = ?",
            (part_id,)
        )
        part = await cursor.fetchone()
        if not part:
            raise HTTPException(status_code=404, detail="Part not found")

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getFile",
                params={"file_id": part[0]}
            )
            file_data = resp.json()
            file_path = file_data["result"]["file_path"]
            file_url = f"https://api.telegram.org/file/bot{TELEGRAM_BOT_TOKEN}/{file_path}"

            tg_response = await client.get(file_url, follow_redirects=True)

            filename = f"{part[1]}_part{part_id}.mp4".replace(" ", "_")
            headers = {
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "video/mp4",
            }

            async def iter_content():
                async for chunk in tg_response.aiter_bytes(chunk_size=65536):
                    yield chunk

            return StreamingResponse(iter_content(), headers=headers)
    finally:
        await db.close()
