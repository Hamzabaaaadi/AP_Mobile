#!/usr/bin/env python3
"""
Copie uniquement la table `stops` depuis une base source (MySQL ou SQLite)
vers la base SQLite utilisée par le backend (`backend/instance/bus_tracking.db`).

Usage:
  python copy_stops.py --source-uri "mysql+pymysql://user:pass@host:3306/dbname"
  python copy_stops.py --source-uri "sqlite:///D:/path/to/source.db"

Le script :
  - sauvegarde `backend/instance/bus_tracking.db` en `.bak_TIMESTAMP`
  - lit toutes les lignes de `stops` dans la source
  - remplace les lignes `stops` dans la DB cible (backend instance)
  - affiche un résumé

Attention : exécutez ce script localement et gardez vos credentials privés.
"""
import argparse
import os
import shutil
import sys
import time
from sqlalchemy import create_engine, MetaData, Table, select, text


def backup_file(path):
    if os.path.exists(path):
        ts = int(time.time())
        bak = f"{path}.bak_{ts}"
        shutil.copy2(path, bak)
        return bak
    return None


def normalize_sqlite_uri(path):
    # Ensure sqlite path is absolute and works with SQLAlchemy on Windows
    # Accept forms: sqlite:///D:/foo.db  or D:/foo.db
    if path.startswith('sqlite:///'):
        return path
    if path.startswith('sqlite://'):
        return path
    # assume local file path
    abspath = os.path.abspath(path)
    return 'sqlite:///' + abspath.replace('\\', '/')


def copy_stops(source_uri, target_sqlite_path):
    target_sqlite_uri = normalize_sqlite_uri(target_sqlite_path)

    print('Source URI:', source_uri)
    print('Target sqlite URI:', target_sqlite_uri)

    # Create engines
    src_engine = create_engine(source_uri)
    tgt_engine = create_engine(target_sqlite_uri)

    # Reflect target metadata to get stops table and columns
    tgt_meta = MetaData()
    tgt_meta.reflect(bind=tgt_engine)
    if 'stops' not in tgt_meta.tables:
        raise RuntimeError('stops table not found in target DB')
    tgt_table = tgt_meta.tables['stops']

    # Read rows from source (robust handling for different Row types)
    src_conn = src_engine.connect()
    try:
        res = src_conn.execute(text('SELECT * FROM stops'))
        raw_rows = res.fetchall()
        rows = []
        for r in raw_rows:
            # Try common mappings: Row._mapping (SQLAlchemy 1.4+), dict(r), or fallback to keys/values
            try:
                mapping = getattr(r, '_mapping', None)
                if mapping is not None:
                    rows.append(dict(mapping))
                    continue
            except Exception:
                pass
            try:
                rows.append(dict(r))
                continue
            except Exception:
                pass
            # Fallback: use keys() and index access
            try:
                keys = r.keys()
                rows.append({k: r[i] for i, k in enumerate(keys)})
                continue
            except Exception:
                # give up for this row
                rows.append({})
    finally:
        src_conn.close()

    print(f'Read {len(rows)} stops from source')

    # Insert into target: backup then replace
    bak = backup_file(target_sqlite_path)
    if bak:
        print('Created backup of target sqlite:', bak)
    else:
        print('No existing target sqlite file found to backup (will create new).')

    inserted = 0
    with tgt_engine.begin() as conn:
        # Delete existing stops
        conn.execute(tgt_table.delete())

        # Prepare insertion: keep only columns that target table has
        tgt_cols = set(c.name for c in tgt_table.columns)
        for r in rows:
            data = {k: v for k, v in r.items() if k in tgt_cols}
            # If source has 'lat'/'lon' instead of latitude/longitude, try to map
            if 'latitude' not in data and 'lat' in r and 'latitude' in tgt_cols:
                data['latitude'] = r.get('lat')
            if 'longitude' not in data and 'lon' in r and 'longitude' in tgt_cols:
                data['longitude'] = r.get('lon')
            conn.execute(tgt_table.insert().values(**data))
            inserted += 1

    print(f'Inserted {inserted} rows into target.stops')
    return inserted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-uri', required=True, help='URI SQLAlchemy source (mysql+pymysql://... or sqlite:///...)')
    parser.add_argument('--target-sqlite', default=os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'bus_tracking.db'),
                        help='chemin du fichier sqlite cible (backend instance)')
    args = parser.parse_args()

    try:
        n = copy_stops(args.source_uri, args.target_sqlite)
        print('Done. Copied', n, 'stops.')
    except Exception as e:
        print('Error:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
