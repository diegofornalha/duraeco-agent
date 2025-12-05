"""
Auth module - Evita importação circular
Contém funções de autenticação JWT
"""

import os
import jwt
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'development_secret_do_not_use_in_production')
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))


def verify_token(token):
    """Verify a JWT token and return the user ID if valid"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None  # Token has expired
    except jwt.InvalidTokenError:
        logger.warning("Invalid token")
        return None  # Invalid token


def create_token(user_id: int) -> str:
    """Create a JWT token for a user"""
    import datetime

    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
    return token
