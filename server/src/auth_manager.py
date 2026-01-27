import sqlite3
import os
import bcrypt
import jwt
import datetime
import random
import time
from src.email_service import email_service

# Database File Path
DB_FILE = os.path.join(os.path.dirname(__file__), '..', 'users.db')
SECRET_KEY = os.environ.get('SECRET_KEY', 'your_secret_key_here_change_in_production')

class AuthManager:
    def __init__(self):
        self._init_db()
        self.pending_verifications = {} # email -> {otp, timestamp, data}

    def _init_db(self):
        """Initialize the users database with necessary tables."""
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        
        # Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_verified INTEGER DEFAULT 0,
                role TEXT DEFAULT 'user'
            )
        ''')

        # Migration: Add role column if not exists
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
        except sqlite3.OperationalError:
            pass # Column already exists

        # Profiles Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                avatar TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        ''')

        # Saved Videos Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS saved_videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                video_id TEXT NOT NULL,
                title TEXT,
                thumbnail TEXT,
                channel TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
                UNIQUE(profile_id, video_id)
            )
        ''')

        # Saved News Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS saved_news (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                article_url TEXT NOT NULL,
                title TEXT,
                source TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
                UNIQUE(profile_id, article_url)
            )
        ''')
        
        # Legal Assistant Conversations Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS legal_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                conversation_id TEXT UNIQUE NOT NULL,
                title TEXT,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE
            )
        ''')
        
        # Legal Conversation Messages Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS legal_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                sender TEXT NOT NULL, -- 'user' or 'ai'
                message TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES legal_conversations (conversation_id) ON DELETE CASCADE
            )
        ''')

        conn.commit()
        conn.close()

    def get_db_connection(self):
        conn = sqlite3.connect(DB_FILE, timeout=30.0)
        conn.execute('PRAGMA journal_mode=WAL;')
        conn.row_factory = sqlite3.Row
        return conn

    def register_user(self, email, password, full_name):
        """Initiate user registration with OTP."""
        # Check if user already exists
        conn = self.get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()

        if user:
            return {'error': 'Email already registered.'}

        # Generate OTP
        otp = str(random.randint(100000, 999999))
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Store in pending verifications (expires in 10 mins)
        self.pending_verifications[email] = {
            'otp': otp,
            'timestamp': time.time(),
            'data': {
                'email': email,
                'password_hash': password_hash,
                'full_name': full_name
            }
        }

        # Send OTP
        res = email_service.send_otp(email, otp)
        if res:
             return {
                 'message': 'OTP sent to email.', 
                 'requires_otp': True,
                 'dev_mode': not email_service.enabled,
                 'debug_otp': otp if not email_service.enabled else None
             }
        else:
             return {'error': 'Failed to send OTP.'}

    def resend_otp(self, email):
        """Resend OTP if user already in pending."""
        record = self.pending_verifications.get(email)
        if not record:
            return {'error': 'Registration session expired. Please register again.'}
            
        # Optional: rate limiting (1 min)
        if time.time() - record['timestamp'] < 60:
            return {'error': 'Please wait 60 seconds before requesting another OTP.'}
            
        # New OTP
        otp = str(random.randint(100000, 999999))
        record['otp'] = otp
        record['timestamp'] = time.time()
        
        if email_service.send_otp(email, otp):
             return {
                 'message': 'New OTP sent.', 
                 'dev_mode': not email_service.enabled,
                 'debug_otp': otp if not email_service.enabled else None
             }
        else:
             return {'error': 'Failed to send OTP.'}

    def verify_otp(self, email, otp):
        """Verify OTP and create user."""
        record = self.pending_verifications.get(email)
        
        if not record:
            return {'error': 'No pending verification found or expired.'}
            
        if time.time() - record['timestamp'] > 600: # 10 mins expiration
            del self.pending_verifications[email]
            return {'error': 'OTP expired.'}
            
        if record['otp'] != otp:
             return {'error': 'Invalid OTP.'}

        # Create User
        data = record['data']
        conn = self.get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                'INSERT INTO users (email, password_hash, full_name, is_verified) VALUES (?, ?, ?, 1)',
                (data['email'], data['password_hash'], data['full_name'])
            )
            # Create default profile
            user_id = cursor.lastrowid
            cursor.execute(
                'INSERT INTO profiles (user_id, name, avatar) VALUES (?, ?, ?)',
                (user_id, data['full_name'], 'default_avatar.png')
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return {'error': 'User creation failed. Email might be duplicate.'}
        finally:
            conn.close()
            del self.pending_verifications[email]

        return {'message': 'Registration successful.', 'success': True}

    def login_user(self, email, password):
        """Authenticate user and return JWT."""
        conn = self.get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()

        if not user:
            return {'error': 'Invalid email or password.'}

        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return {'error': 'Invalid email or password.'}

        # Generate Token
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'] or 'user',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, SECRET_KEY, algorithm='HS256')

        return {
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'full_name': user['full_name'],
                'role': user['role'] or 'user'
            }
        }

    def get_profiles(self, user_id):
        try:
            conn = self.get_db_connection()
            profiles = conn.execute('SELECT * FROM profiles WHERE user_id = ?', (user_id,)).fetchall()
            conn.close()
            return [dict(p) for p in profiles]
        except Exception as e:
            print(f"❌ [AuthManager] get_profiles error for user {user_id}: {e}")
            import traceback
            traceback.print_exc()
            return []

    def create_profile(self, user_id, name, avatar="default_avatar.png"):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Check profile count limit (e.g., 5)
        count = cursor.execute('SELECT COUNT(*) FROM profiles WHERE user_id = ?', (user_id,)).fetchone()[0]
        if count >= 5:
            conn.close()
            return {'error': 'Maximum profile limit reached.'}

        cursor.execute('INSERT INTO profiles (user_id, name, avatar) VALUES (?, ?, ?)', (user_id, name, avatar))
        conn.commit()
        conn.close()
        return {'message': 'Profile created successfully.', 'success': True}

    def update_profile(self, user_id, profile_id, name, avatar):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Verify ownership
        owner = cursor.execute('SELECT user_id FROM profiles WHERE id = ?', (profile_id,)).fetchone()
        if not owner or owner[0] != user_id:
             conn.close()
             return {'error': 'Profile not found or access denied.'}

        cursor.execute('UPDATE profiles SET name = ?, avatar = ? WHERE id = ?', (name, avatar, profile_id))
        conn.commit()
        conn.close()
        return {'message': 'Profile updated.', 'success': True}

    def delete_profile(self, user_id, profile_id):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Verify ownership
        owner = cursor.execute('SELECT user_id FROM profiles WHERE id = ?', (profile_id,)).fetchone()
        if not owner or owner[0] != user_id:
             conn.close()
             return {'error': 'Profile not found or access denied.'}

        cursor.execute('DELETE FROM profiles WHERE id = ?', (profile_id,))
        conn.commit()
        conn.close()
        return {'message': 'Profile deleted.', 'success': True}

    # --- Video Saving ---
    def save_video(self, profile_id, video_data):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO saved_videos (profile_id, video_id, title, thumbnail, channel)
                VALUES (?, ?, ?, ?, ?)
            ''', (profile_id, video_data['video_id'], video_data['title'], video_data['thumbnail'], video_data['channel']))
            conn.commit()
            return {'message': 'Video saved.', 'success': True}
        except sqlite3.IntegrityError:
            return {'message': 'Video already saved.', 'success': True} # Idempotent
        except Exception as e:
             return {'error': str(e)}
        finally:
            conn.close()

    def unsave_video(self, profile_id, video_id):
        conn = self.get_db_connection()
        conn.execute('DELETE FROM saved_videos WHERE profile_id = ? AND video_id = ?', (profile_id, video_id))
        conn.commit()
        conn.close()
        return {'message': 'Video removed.', 'success': True}

    def get_saved_videos(self, profile_id):
        conn = self.get_db_connection()
        videos = conn.execute('SELECT * FROM saved_videos WHERE profile_id = ? ORDER BY added_at DESC', (profile_id,)).fetchall()
        conn.close()
        return [dict(v) for v in videos]
        
    # --- News Saving ---
    def save_news(self, profile_id, article_data):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO saved_news (profile_id, article_url, title, source)
                VALUES (?, ?, ?, ?)
            ''', (profile_id, article_data['url'], article_data['title'], article_data['source']))
            conn.commit()
            return {'message': 'Article saved.', 'success': True}
        except sqlite3.IntegrityError:
            return {'message': 'Article already saved.', 'success': True}
        except Exception as e:
             return {'error': str(e)}
        finally:
            conn.close()

    def unsave_news(self, profile_id, article_url):
        conn = self.get_db_connection()
        conn.execute('DELETE FROM saved_news WHERE profile_id = ? AND article_url = ?', (profile_id, article_url))
        conn.commit()
        conn.close()
        return {'message': 'Article removed.', 'success': True}

    def get_saved_news(self, profile_id):
        conn = self.get_db_connection()
        news = conn.execute('SELECT * FROM saved_news WHERE profile_id = ? ORDER BY added_at DESC', (profile_id,)).fetchall()
        conn.close()
        return [dict(n) for n in news]

    # --- Legal Assistant Storage ---
    def create_legal_conversation(self, profile_id, title="New Conversation"):
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Generate unique ID
        conversation_id = f"conv_{int(time.time())}_{random.randint(1000, 9999)}"
        
        cursor.execute('''
            INSERT INTO legal_conversations (profile_id, conversation_id, title)
            VALUES (?, ?, ?)
        ''', (profile_id, conversation_id, title))
        conn.commit()
        conn.close()
        return {'conversation_id': conversation_id, 'title': title}

    def add_legal_message(self, conversation_id, sender, message):
        conn = self.get_db_connection()
        conn.execute('''
            INSERT INTO legal_messages (conversation_id, sender, message)
            VALUES (?, ?, ?)
        ''', (conversation_id, sender, message))
        
        # Update last_updated
        conn.execute('UPDATE legal_conversations SET last_updated = CURRENT_TIMESTAMP WHERE conversation_id = ?', (conversation_id,))
        
        conn.commit()
        conn.close()
        return {'success': True}

    def get_legal_conversations(self, profile_id):
        conn = self.get_db_connection()
        convs = conn.execute('SELECT * FROM legal_conversations WHERE profile_id = ? ORDER BY last_updated DESC', (profile_id,)).fetchall()
        conn.close()
        return [dict(c) for c in convs]

    def get_legal_messages(self, conversation_id):
        conn = self.get_db_connection()
        msgs = conn.execute('SELECT * FROM legal_messages WHERE conversation_id = ? ORDER BY timestamp ASC', (conversation_id,)).fetchall()
        conn.close()
        return [dict(m) for m in msgs]

# Export a singleton instance
auth_manager = AuthManager()
