# FlickPlay — Netflix-style Video Streaming Platform

Telegram-powered video streaming with Netflix-style UI, Admin Panel, and 12-hour access tokens.

---

## Project Structure

```
flickplay/
├── backend/          # Python FastAPI backend
├── frontend/         # React.js user-facing app
├── admin/            # Admin panel (single HTML file)
├── telegram_helper.py
└── README.md
```

---

## STEP 1 — Telegram Bot Setup

1. Open Telegram → talk to @BotFather
2. Send `/newbot` → give it a name → get your **BOT_TOKEN**
3. Create a **private channel** → add your bot as admin
4. Get the channel's numeric ID (forward a msg to @getidsbot)
5. Run `python telegram_helper.py` to test — send a video, get file_id

---

## STEP 2 — Backend Setup

```bash
cd backend

# Copy env file
cp .env.example .env
# Edit .env and set:
# SECRET_KEY = any random string
# TELEGRAM_BOT_TOKEN = your bot token from step 1

# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
# API runs on http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

## STEP 3 — Admin Panel

Open `admin/index.html` in your browser directly (no install needed).

**Default login:**
- Email: `admin@flickplay.com`
- Password: `admin123`

**How to add videos:**
1. Login to admin panel
2. Click "Videos" → "+ Add Video"
3. Fill in title, category, thumbnail, etc.
4. Save the video
5. Click "Parts" button on the video
6. Paste the `telegram_file_id` (get from telegram_helper.py)
7. Done! Video is live on your platform.

**Settings you can change:**
- App name & logo
- Telegram channel URL
- Pro/Premium prices
- Watermark on/off
- Ads on/off for free users

---

## STEP 4 — Frontend Setup

```bash
cd frontend

# Install
npm install

# Set your API URL (edit .env or use default localhost)
echo "REACT_APP_API_URL=http://localhost:8000" > .env

# Start dev server
npm start
# Opens at http://localhost:3000

# Build for production
npm run build
```

---

## Features

### User Features
- Register/Login with JWT auth
- Netflix-style dark UI
- Browse by category: Movies, Web Series, Shows, Drama, Kids
- Search by title, cast, tags
- Video player with watermark protection
- Anti screen-record (pauses when tab hidden, blocks right-click, blocks PrintScreen)
- Free / Pro / Premium plans
- 12-hour access token system
- Download videos (Premium only)
- PWA — add to home screen on mobile
- Telegram channel join prompt

### Admin Features
- Dashboard with stats
- Add/Edit/Delete videos
- Manage video parts (multi-part support)
- Upload Telegram file IDs
- User management + plan changes
- App settings editor (name, logo, prices, security)

### Plans
| Feature | Free | Pro (₹99) | Premium (₹199) |
|---------|------|-----------|----------------|
| Ads | Yes | No | No |
| Quality | 480p | 1080p | 4K |
| Download | No | No | Yes |
| Content | Free only | Free+Pro | All |

---

## Security Features

1. **JWT Tokens** — 30-day session tokens
2. **Stream Tokens** — 1-hour signed tokens for video URLs
3. **Access Level Check** — server-side plan verification on every stream request
4. **Watermark** — user email embedded as transparent overlay
5. **Anti-Record** — pauses on tab switch, blocks right-click, blocks PrintScreen key
6. **No Direct URLs** — videos served via signed proxy, not direct Telegram links
7. **12-Hour App Access** — share a time-limited link to the app

---

## Deployment

### Backend on Railway/Render:
```bash
# Set environment variables:
SECRET_KEY=your-production-secret
TELEGRAM_BOT_TOKEN=your-bot-token
STREAM_SECRET=your-stream-secret

# Start command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Frontend on Vercel/Netlify:
```bash
# Set env var:
REACT_APP_API_URL=https://your-backend.railway.app

# Build command: npm run build
# Publish directory: build
```

### Admin Panel:
- Host `admin/index.html` on any static host
- Or open locally — it works as a standalone file

---

## Payment Integration (Razorpay)

In `frontend/src/pages/Plans.js`, find `handleUpgrade` and add:

```javascript
const options = {
  key: "YOUR_RAZORPAY_KEY",
  amount: plan.price * 100,
  currency: "INR",
  name: "FlickPlay",
  description: `${plan.name} Plan`,
  handler: async (response) => {
    // Call your backend to verify payment and update user plan
    await api.post('/api/plans/verify', { payment_id: response.razorpay_payment_id, plan: plan.id });
    toast.success('Payment successful! Plan upgraded.');
  }
};
const rzp = new window.Razorpay(options);
rzp.open();
```

---

## Default Admin Credentials
- **Email:** admin@flickplay.com
- **Password:** admin123
- **Change immediately after first login!**
