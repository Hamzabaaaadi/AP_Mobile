import os
import sys

# Ensure parent (backend/) is on sys.path so imports work when running from scripts/
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from models import db


def apply_schema():
    app, _ = create_app()
    with app.app_context():
        print('Creating missing tables (db.create_all())...')
        db.create_all()
        print('Done: db.create_all() executed')


if __name__ == '__main__':
    apply_schema()
