#!/usr/bin/env python3
"""
Script pour basculer la configuration du backend vers une autre base de données.

Usage:
  python switch_database.py --target-uri "mysql+pymysql://user:pass@host:3306/dbname"

Ce que fait le script:
  - sauvegarde `backend/instance/bus_tracking.db` en `.bak_TIMESTAMP`
  - sauvegarde `backend/.env` en `.bak_TIMESTAMP`
  - remplace ou ajoute la ligne `DATABASE_URL=` dans `backend/.env`
  - teste la connexion à la base cible (exécute `SELECT COUNT(*) FROM stops` si possible)

Important: ne pas partager de credentials en clair dans un espace public.
"""
import argparse
import os
import shutil
import time
import sys

from sqlalchemy import create_engine, text


def backup_file(path):
    if not os.path.exists(path):
        return None
    ts = int(time.time())
    bak = f"{path}.bak_{ts}"
    shutil.copy2(path, bak)
    return bak


def update_env_file(env_path, target_uri):
    # Read existing .env (if any)
    lines = []
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

    found = False
    new_lines = []
    for ln in lines:
        if ln.strip().startswith('DATABASE_URL='):
            new_lines.append(f'DATABASE_URL={target_uri}\n')
            found = True
        else:
            new_lines.append(ln)

    if not found:
        new_lines.append(f'\nDATABASE_URL={target_uri}\n')

    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)


def test_connection(target_uri):
    try:
        engine = create_engine(target_uri, connect_args={})
        with engine.connect() as conn:
            # Try a safe test: if `stops` exists, count rows; otherwise just connect
            try:
                res = conn.execute(text('SELECT COUNT(*) AS c FROM stops'))
                c = res.scalar()
                return True, f'stops count = {c}'
            except Exception:
                return True, 'Connected but `stops` table not available or query failed.'
    except Exception as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--target-uri', required=True, help='URI SQLAlchemy cible')
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    instance_db = os.path.join(repo_root, 'instance', 'bus_tracking.db')
    env_file = os.path.join(repo_root, '.env')

    print('Repo root:', repo_root)

    # Backup sqlite
    bak_db = backup_file(instance_db)
    if bak_db:
        print('SQLite backup created:', bak_db)
    else:
        print('No sqlite file to backup at', instance_db)

    # Backup .env
    bak_env = backup_file(env_file)
    if bak_env:
        print('.env backup created:', bak_env)
    else:
        print('No .env file found; a new one will be created at', env_file)

    # Update .env
    update_env_file(env_file, args.target_uri)
    print('Updated', env_file, 'with DATABASE_URL')

    # Test connection
    ok, msg = test_connection(args.target_uri)
    if ok:
        print('Connection test successful:', msg)
        print('\nNext steps:')
        print(' - Restart the backend so it picks the new DATABASE_URL (use your usual run script).')
        print("   Example (PowerShell):")
        print("     Set-Location d:\\Casa_comp\\bus-tracking-system\\backend")
        print("     python run_backend.ps1")
    else:
        print('Connection test FAILED:', msg)
        print('The .env file has still been updated; you can revert using the .env backup.')


if __name__ == '__main__':
    main()
