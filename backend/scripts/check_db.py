import os
import sys

# Ensure parent directory (project backend/) is on sys.path so imports work
scripts_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(scripts_dir)
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

from app import create_app
from models import db, Stop

app, socketio = create_app()

with app.app_context():
    uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    print('SQLALCHEMY_DATABASE_URI:', uri)

    try:
        stops = Stop.query.order_by(Stop.id).all()
        print(f'Found {len(stops)} stops:')
        for s in stops:
            print(s.id, s.name, s.latitude, s.longitude, s.address)
    except Exception as e:
        print('Error querying stops:', e)
