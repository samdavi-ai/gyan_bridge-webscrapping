import sqlite3
import os

try:
    conn = sqlite3.connect('news.db')
    c = conn.cursor()
    c.execute("SELECT count(*) FROM news")
    count = c.fetchone()[0]
    print(f"News Item Count: {count}")
    
    if count > 0:
        c.execute("SELECT title, image, source FROM news ORDER BY timestamp DESC LIMIT 10")
        print("\n--- Last 10 News Items ---")
        for row in c.fetchall():
            title = row[0][:50] + "..." if len(row[0]) > 50 else row[0]
            print(f"Title: {title}")
            print(f"Source: {row[2]}")
            print(f"Image: {row[1]}")
            print("-" * 30)
    conn.close()
except Exception as e:
    print(f"Error: {e}")
