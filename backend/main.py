from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn

from database import init_db
from routers import auth, videos, stream, admin, plans, tokens

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="FlickPlay API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(stream.router, prefix="/api/stream", tags=["stream"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(tokens.router, prefix="/api/tokens", tags=["tokens"])

@app.get("/")
async def root():
    return {"message": "FlickPlay API Running", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
