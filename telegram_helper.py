"""
FlickPlay Telegram Helper
Run this to upload videos to Telegram and get file_ids for admin panel.

Usage:
  python telegram_helper.py
  Then forward/send video to bot and get file_id
"""
import os
import asyncio
from telegram import Update, Bot
from telegram.ext import Application, MessageHandler, filters, ContextTypes

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "@your_channel")  # or numeric ID like -100123456789

async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """When you send/forward a video to the bot, it replies with file_id"""
    msg = update.message
    file_id = None
    file_name = "unknown"

    if msg.video:
        file_id = msg.video.file_id
        file_name = msg.video.file_name or "video.mp4"
        size_mb = msg.video.file_size / (1024*1024) if msg.video.file_size else 0
        duration = msg.video.duration
        await msg.reply_text(
            f"✅ Video File ID:\n\n`{file_id}`\n\n"
            f"📁 Name: {file_name}\n"
            f"📦 Size: {size_mb:.1f} MB\n"
            f"⏱ Duration: {duration}s\n\n"
            f"Copy the file_id above and paste it in Admin Panel → Parts",
            parse_mode='Markdown'
        )
    elif msg.document:
        file_id = msg.document.file_id
        file_name = msg.document.file_name or "file"
        await msg.reply_text(f"✅ Document File ID:\n\n`{file_id}`\n\nFile: {file_name}", parse_mode='Markdown')
    else:
        await msg.reply_text("Please send a video file or document")

async def handle_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎬 *FlickPlay Telegram Helper Bot*\n\n"
        "Send or forward a video to this bot.\n"
        "I'll give you the file_id to paste in the admin panel.\n\n"
        "Steps:\n"
        "1. Upload video to this bot\n"
        "2. Copy the file_id from my reply\n"
        "3. Go to Admin Panel → Videos → Parts\n"
        "4. Paste file_id in the 'Telegram File ID' field",
        parse_mode='Markdown'
    )

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.COMMAND, handle_command))
    app.add_handler(MessageHandler(filters.VIDEO | filters.Document.ALL, handle_video))
    print(f"Bot running... Send a video to get its file_id")
    app.run_polling()

if __name__ == "__main__":
    main()
