from fastapi import APIRouter, HTTPException, Header
from database import get_db
from routers.auth import decode_jwt
from datetime import datetime, timedelta
import secrets

router = APIRouter()

@router.get("/")
async def get_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "INR",
                "features": {
                    "ads": True,
                    "download": False,
                    "quality": "480p",
                    "offline": False,
                    "access_level": "free"
                }
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 99,
                "currency": "INR",
                "features": {
                    "ads": False,
                    "download": False,
                    "quality": "1080p",
                    "offline": False,
                    "access_level": "pro"
                }
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 199,
                "currency": "INR",
                "features": {
                    "ads": False,
                    "download": True,
                    "quality": "4K",
                    "offline": True,
                    "access_level": "premium"
                }
            }
        ]
    }
