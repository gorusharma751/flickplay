import aiosqlite
import hashlib
import os

DB_PATH = "flickplay.db"

async def get_db():
    return await aiosqlite.connect(DB_PATH)

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            plan TEXT DEFAULT 'free',
            telegram_joined INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            language TEXT DEFAULT 'Hindi',
            year INTEGER,
            duration TEXT,
            quality TEXT DEFAULT 'HD',
            thumbnail_url TEXT,
            trailer_url TEXT,
            cast_info TEXT,
            director TEXT,
            rating REAL DEFAULT 0,
            access_level TEXT DEFAULT 'free',
            total_parts INTEGER DEFAULT 1,
            is_series INTEGER DEFAULT 0,
            season_number INTEGER,
            episode_number INTEGER,
            parent_series_id INTEGER,
            tags TEXT,
            is_active INTEGER DEFAULT 1,
            is_featured INTEGER DEFAULT 0,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_series_id) REFERENCES videos(id)
        );

        CREATE TABLE IF NOT EXISTS video_parts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            part_number INTEGER NOT NULL,
            title TEXT,
            telegram_file_id TEXT NOT NULL,
            duration TEXT,
            size_mb REAL,
            quality TEXT DEFAULT 'HD',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS access_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            token_type TEXT DEFAULT 'watch',
            expires_at TIMESTAMP NOT NULL,
            is_used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS watch_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            video_id INTEGER NOT NULL,
            progress_seconds INTEGER DEFAULT 0,
            last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, video_id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (video_id) REFERENCES videos(id)
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            plan TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_id TEXT,
            status TEXT DEFAULT 'active',
            starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO app_settings (key, value) VALUES
            ('app_name', 'FlickPlay'),
            ('app_logo', ''),
            ('telegram_channel', 'https://t.me/flickplay'),
            ('telegram_required', '1'),
            ('free_plan_ads', '1'),
            ('hero_video_id', ''),
            ('featured_categories', 'Movies,Web Series,Shows,Drama'),
            ('watermark_enabled', '1'),
            ('screen_record_block', '1'),
            ('pro_price', '99'),
            ('premium_price', '199');
        """)
        await db.commit()

        # Create default admin
        pwd_hash = hashlib.sha256("admin123".encode()).hexdigest()
        try:
            await db.execute(
                "INSERT OR IGNORE INTO admins (email, password_hash, name) VALUES (?, ?, ?)",
                ("admin@flickplay.com", pwd_hash, "Admin")
            )
            await db.commit()
        except:
            pass

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == hashed
