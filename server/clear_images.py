import sqlite3
import os

db_path = 'd:/GB_web_scraber/server/news.db'
patterns = [
    'googleusercontent', 'gstatic', 'favicon', 'logo', 'avatar', 'icon', 
    'branding', 'placeholder', 'transparent', 'pixel', 'default', 
    'lh3.google', 'google_news', 'gnews'
]

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    query = " OR ".join([f"image LIKE '%{p}%'" for p in patterns])
    c.execute(f"UPDATE news SET image = NULL WHERE {query}")
    print(f"Cleared {c.rowcount} bad images from DB.")
    conn.commit()
    conn.close()
else:
    print("DB file not found.")
