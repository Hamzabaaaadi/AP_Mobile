import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///bus_tracking.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-string'
    JWT_ACCESS_TOKEN_EXPIRES = False  # Tokens ne expirent pas pour la démo
    
    # Configuration WebSocket
    SOCKETIO_CORS_ALLOWED_ORIGINS = "*"
    
    # Configuration GPS
    GPS_UPDATE_INTERVAL = 30  # secondes
    PREDICTION_ACCURACY_THRESHOLD = 0.85
    
    # Configuration occupation
    MAX_OCCUPANCY_HISTORY = 100  # nombre d'entrées à garder par bus
