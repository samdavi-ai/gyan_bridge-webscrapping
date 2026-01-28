import sys
import os
import sqlite3
import time
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.news_feeder import NewsFeeder

def recover_images():
    nf = NewsFeeder()
    print("🚀 Starting bulk image recovery...")
    
    conn = sqlite3.connect('d:/GB_web_scraber/server/news.db', timeout=60.0)
    c = conn.cursor()
    
    # Get all news where image is missing or bad
    c.execute("SELECT id, title, url FROM news WHERE image IS NULL OR image LIKE '%googleusercontent%' OR image LIKE '%gstatic%'")
    rows = c.fetchall()
    print(f"Found {len(rows)} articles needing image recovery.")
    
    count = 0
    for nid, title, url in rows:
        try:
            print(f"[{count+1}/{len(rows)}] Recovering for: {title[:50]}...")
            
            # Resolve
            resolved = nf._resolve_url(url)
            
            # Extract
            img = nf._fetch_og_image(resolved)
            
            # Fallback
            if not img:
                img = nf._fetch_fallback_image(title)
                
            if img:
                c.execute("UPDATE news SET image = ? WHERE id = ?", (img, nid))
                conn.commit()
                print(f"  ✅ Image found: {img[:50]}...")
            else:
                print(f"  ❌ No image found.")
            
            count += 1
            time.sleep(0.5) # Jitter to avoid rate limiting
        except Exception as e:
            print(f"  ⚠️ Error: {e}")
            
    conn.close()
    print(f"✅ Recovery complete. Processed {count} items.")

if __name__ == "__main__":
    recover_images()
