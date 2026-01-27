from functools import wraps
from flask import request, jsonify, g
import jwt
import os

SECRET_KEY = os.environ.get('SECRET_KEY', 'your_secret_key_here_change_in_production')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
             auth_header = request.headers['Authorization']
             if auth_header.startswith('Bearer '):
                 token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            # store user info in flask global
            g.user_id = data['user_id']
            g.user_email = data['email']
        except jwt.ExpiredSignatureError:
             return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(*args, **kwargs)
    
    return decorated
