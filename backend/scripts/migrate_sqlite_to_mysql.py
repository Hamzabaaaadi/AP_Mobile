"""
Script de migration SQLite -> MySQL pour le projet Bus Tracking System.

Usage:
  - dry run (affiche ce qui serait copié):
      python migrate_sqlite_to_mysql.py --dry-run

  - exécution (nécessite l'URI MySQL):
      python migrate_sqlite_to_mysql.py --target-uri "mysql+pymysql://user:pass@host:3306/dbname"

Le script :
  1. Sauvegarde le fichier SQLite (`backend/instance/bus_tracking.db`) en `.bak_TIMESTAMP`.
  2. Crée les tables sur la cible (utilise `create_app()` et `db.create_all()`).
  3. Copie les données table par table en respectant un ordre simple des dépendances.

Attention: exécutez sur une base MySQL de test d'abord. Le script tente de préserver les IDs.
"""

import argparse
import os
import shutil
import sqlite3
import time
import json
import sys

from sqlalchemy import create_engine, MetaData, Table


SQLITE_DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'bus_tracking.db')


def backup_sqlite(db_path):
    ts = int(time.time())
    bak = db_path + f'.bak_{ts}'
    shutil.copy2(db_path, bak)
    return bak


def list_tables_sqlite(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [r[0] for r in cur.fetchall()]
    conn.close()
    return tables


def fetch_rows_sqlite(db_path, table):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table}")
    cols = [d[0] for d in cur.description]
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return cols, rows


def create_target_tables(target_uri):
    # Set env so app.create_app reads the target URI
    os.environ['DATABASE_URL'] = target_uri
    # Import app factory
    # Ensure parent directory is on sys.path so we can import app from project root
    parent = os.path.dirname(os.path.dirname(__file__))
    if parent not in sys.path:
        sys.path.insert(0, parent)
    from app import create_app, init_database
    app, socketio = create_app()
    with app.app_context():
        from models import db
        db.create_all()
    return True


def copy_table_to_target(target_uri, sqlite_table, dry_run=False):
    # Use SQLAlchemy core to insert rows to target table
    target_engine = create_engine(target_uri)
    metadata = MetaData()
    metadata.reflect(bind=target_engine)

    if sqlite_table not in metadata.tables:
        print(f"Target table '{sqlite_table}' not found in target DB; skipping.")
        return 0

    target_table = metadata.tables[sqlite_table]

    cols, rows = fetch_rows_sqlite(SQLITE_DB, sqlite_table)
    if not rows:
        return 0

    inserted = 0
    if dry_run:
        print(f"[dry-run] {len(rows)} rows would be inserted into {sqlite_table}")
        return len(rows)

    with target_engine.begin() as conn:
        for r in rows:
            # Prepare dict with only columns existing in target
            data = {k: v for k, v in r.items() if k in target_table.c}
            conn.execute(target_table.insert().values(**data))
            inserted += 1

    return inserted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target-uri', help='URI SQLAlchemy cible (ex: mysql+pymysql://user:pass@host:3306/db)')
    parser.add_argument('--dry-run', action='store_true', help='Ne pas écrire, affiche seulement ce qui serait copié')
    args = parser.parse_args()

    if not os.path.exists(SQLITE_DB):
        print('Fichier SQLite introuvable:', SQLITE_DB)
        return

    print('SQLite DB:', SQLITE_DB)

    if args.dry_run:
        print('Running in dry-run mode (no writes).')

    if not args.target_uri and not args.dry_run:
        print('Erreur: vous devez fournir --target-uri ou lancer en --dry-run')
        return

    # Backup
    bak = backup_sqlite(SQLITE_DB)
    print('Backup created:', bak)

    # If dry-run only list tables and counts
    tables = list_tables_sqlite(SQLITE_DB)
    print('Tables in sqlite:', tables)

    if args.dry_run:
        for t in tables:
            cols, rows = fetch_rows_sqlite(SQLITE_DB, t)
            print(f"{t}: {len(rows)} rows, columns: {cols}")
        print('Dry-run finished.')
        return

    target_uri = args.target_uri
    print('Target URI:', target_uri)

    # Create tables on target
    print('Creating tables on target DB...')
    create_target_tables(target_uri)
    print('Target tables created (or already existed).')

    # Copy order: drivers, routes, stops, route_stops, buses, positions, predictions, occupancy, trip_history, user_favorites
    order = ['drivers', 'routes', 'stops', 'route_stops', 'buses', 'positions', 'predictions', 'occupancy', 'trip_history', 'user_favorites']
    summary = {}
    for t in order:
        if t not in tables:
            print(f"Table {t} not present in sqlite, skipping.")
            summary[t] = 0
            continue
        print(f"Copying table {t}...")
        try:
            n = copy_table_to_target(target_uri, t, dry_run=False)
            summary[t] = n
            print(f"Inserted {n} rows into {t}.")
        except Exception as e:
            print(f"Error copying {t}: {e}")
            summary[t] = 'error'

    print('Migration summary:')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()
