from fastapi import APIRouter, HTTPException, Header
from database import get_db
from routers.auth import decode_jwt
from datetime import datetime, timedelta
import secrets

router = APIRouter()

@router.post("/generate")
async def generate_access_token(authorization: str = Header(None)):
    """Generate a 12-hour access token for the user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_jwt(authorization.replace("Bearer ", ""))
    user_id = payload["user_id"]

    db = await get_db()
    try:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=12)
        await db.execute(
            "INSERT INTO access_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            (user_id, token, expires_at.isoformat())
        )
        await db.commit()
        return {
            "access_token": token,
            "expires_at": expires_at.isoformat(),
            "expires_in_hours": 12,
            "app_url": f"/app?token={token}"
        }
    finally:
        await db.close()

@router.get("/verify/{token}")
async def verify_access_token(token: str):
    """Verify if an access token is still valid"""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT at.id, at.user_id, at.expires_at, u.plan, u.name, u.email
               FROM access_tokens at JOIN users u ON at.user_id = u.id
               WHERE at.token = ? AND at.expires_at > datetime('now')""",
            (token,)
        )
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=403, detail="Token expired or invalid. Please get a new access link.")
        return {
            "valid": True,
            "user_id": row[1],
            "expires_at": row[2],
            "plan": row[3],
            "name": row[4],
            "email": row[5]
        }
    finally:
        await db.close()

@router.get("/my-tokens")
async def get_my_tokens(authorization: str = Header(None)):
    payload = decode_jwt((authorization or "").replace("Bearer ", ""))
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT token, expires_at, created_at FROM access_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 5",
            (payload["user_id"],)
        )
        rows = await cursor.fetchall()
        return [{"token": r[0], "expires_at": r[1], "created_at": r[2]} for r in rows]
    finally:
        await db.close()

@router.delete("/revoke/{token}")
async def revoke_token(token: str, authorization: str = Header(None)):
    payload = decode_jwt((authorization or "").replace("Bearer ", ""))
    db = await get_db()
    try:
        await db.execute(
            "DELETE FROM access_tokens WHERE token = ? AND user_id = ?",
            (token, payload["user_id"])
        )
        await db.commit()
        return {"message": "Token revoked"}
    finally:
        await db.close()
