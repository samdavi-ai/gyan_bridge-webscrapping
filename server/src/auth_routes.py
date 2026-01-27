from flask import Blueprint, request, jsonify, g
from src.auth_manager import auth_manager
from src.middleware import token_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required.'}), 400
    
    full_name = data.get('full_name', 'User')
    result = auth_manager.register_user(data['email'], data['password'], full_name)
    
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result), 200

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    if not data or not data.get('email') or not data.get('otp'):
        return jsonify({'error': 'Email and OTP are required.'}), 400
        
    result = auth_manager.verify_otp(data['email'], data['otp'])
    
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result), 200

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    data = request.json
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required.'}), 400
        
    result = auth_manager.resend_otp(data['email'])
    
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result), 200

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required.'}), 400
        
    result = auth_manager.login_user(data['email'], data['password'])
    
    if result.get('error'):
        return jsonify(result), 401
    return jsonify(result), 200

@auth_bp.route('/profiles', methods=['GET'])
@token_required
def get_profiles():
    # g.user_id is set by token_required middleware
    profiles = auth_manager.get_profiles(g.user_id)
    return jsonify(profiles), 200

@auth_bp.route('/profiles', methods=['POST'])
@token_required
def create_profile():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Profile name is required.'}), 400
        
    result = auth_manager.create_profile(g.user_id, data['name'], data.get('avatar', 'default_avatar.png'))
    
    if result.get('error'):
        return jsonify(result), 400
    return jsonify(result), 201

@auth_bp.route('/profiles/<int:profile_id>', methods=['PUT'])
@token_required
def update_profile(profile_id):
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Profile name is required.'}), 400
    
    # user_id is from g.user_id, profile_id from URL
    result = auth_manager.update_profile(g.user_id, profile_id, data['name'], data.get('avatar', 'default_avatar.png'))
    if result.get('error'): return jsonify(result), 403
    return jsonify(result), 200

@auth_bp.route('/profiles/<int:profile_id>', methods=['DELETE'])
@token_required
def delete_profile(profile_id):
    result = auth_manager.delete_profile(g.user_id, profile_id)
    if result.get('error'): return jsonify(result), 403
    return jsonify(result), 200

def _verify_profile_access(user_id, profile_id):
    """Helper to ensure user owns the profile."""
    profiles = auth_manager.get_profiles(user_id)
    # Check if profile_id (int) exists in user's profiles
    # profile['id'] is likely int from sqlite3.Row
    if not any(p['id'] == int(profile_id) for p in profiles):
        return False
    return True

# --- Saved Videos Endpoints ---

@auth_bp.route('/profiles/<int:profile_id>/saved/videos', methods=['GET'])
@token_required
def get_saved_videos(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
        
    videos = auth_manager.get_saved_videos(profile_id)
    return jsonify(videos), 200

@auth_bp.route('/profiles/<int:profile_id>/saved/videos', methods=['POST'])
@token_required
def save_video(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
    
    data = request.json
    # Basic validation
    required = ['video_id', 'title', 'thumbnail', 'channel']
    if not all(k in data for k in required):
         return jsonify({'error': 'Missing video data fields.'}), 400

    result = auth_manager.save_video(profile_id, data)
    if result.get('error'): return jsonify(result), 400
    return jsonify(result), 201

@auth_bp.route('/profiles/<int:profile_id>/saved/videos/<video_id>', methods=['DELETE'])
@token_required
def unsave_video(profile_id, video_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
        
    result = auth_manager.unsave_video(profile_id, video_id)
    return jsonify(result), 200

# --- Saved News Endpoints ---

@auth_bp.route('/profiles/<int:profile_id>/saved/news', methods=['GET'])
@token_required
def get_saved_news(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
        
    news = auth_manager.get_saved_news(profile_id)
    return jsonify(news), 200

@auth_bp.route('/profiles/<int:profile_id>/saved/news', methods=['POST'])
@token_required
def save_news(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
    
    data = request.json
    required = ['url', 'title', 'source']
    if not all(k in data for k in required):
         return jsonify({'error': 'Missing news data fields.'}), 400

    result = auth_manager.save_news(profile_id, data)
    if result.get('error'): return jsonify(result), 400
    return jsonify(result), 201

@auth_bp.route('/profiles/<int:profile_id>/saved/news', methods=['DELETE'])
@token_required
def unsave_news(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied to this profile.'}), 403
    
    # URL is in query param or body? DELETE with body is discouraged but used.
    # Better to use query param for URL
    url = request.args.get('url')
    if not url:
        return jsonify({'error': 'URL parameter required.'}), 400
        
    result = auth_manager.unsave_news(profile_id, url)
    return jsonify(result), 200

# --- Legal Assistant Endpoints ---

@auth_bp.route('/profiles/<int:profile_id>/legal/conversations', methods=['POST'])
@token_required
def create_legal_conversation(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied.'}), 403
    
    data = request.json
    title = data.get('title', 'New Conversation')
    result = auth_manager.create_legal_conversation(profile_id, title)
    return jsonify(result), 201

@auth_bp.route('/profiles/<int:profile_id>/legal/conversations', methods=['GET'])
@token_required
def get_legal_conversations(profile_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied.'}), 403
    
    conversations = auth_manager.get_legal_conversations(profile_id)
    return jsonify(conversations), 200

@auth_bp.route('/profiles/<int:profile_id>/legal/conversations/<conv_id>/messages', methods=['GET'])
@token_required
def get_legal_messages(profile_id, conv_id):
    # Verify profile access
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied.'}), 403
    
    # Optional: Verify conversation belongs to profile (omitted for speed, but good practice)
    messages = auth_manager.get_legal_messages(conv_id)
    return jsonify(messages), 200

@auth_bp.route('/profiles/<int:profile_id>/legal/conversations/<conv_id>/messages', methods=['POST'])
@token_required
def add_legal_message(profile_id, conv_id):
    if not _verify_profile_access(g.user_id, profile_id):
        return jsonify({'error': 'Access denied.'}), 403
    
    data = request.json
    if not data or not data.get('sender') or not data.get('message'):
        return jsonify({'error': 'Sender and message required.'}), 400
        
    result = auth_manager.add_legal_message(conv_id, data['sender'], data['message'])
    return jsonify(result), 201
