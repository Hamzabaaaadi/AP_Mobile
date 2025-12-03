#!/usr/bin/env python3
"""
Script simple pour tester une URI MySQL et afficher COUNT(*) + 5 exemples
Usage:
  python dryrun_mysql_stops.py "mysql+pymysql://user:pass@host:3306/db"

Ce script est conçu pour être lancé depuis PowerShell.
"""
import sys
import traceback
from sqlalchemy import create_engine, text


def main():
    if len(sys.argv) < 2:
        print('Usage: python dryrun_mysql_stops.py "<SQLALCHEMY_URI>"')
        sys.exit(1)

    uri = sys.argv[1]
    print('Testing URI:', uri)
    try:
        engine = create_engine(uri)
        with engine.connect() as conn:
            try:
                cnt = conn.execute(text('SELECT COUNT(*) AS c FROM stops')).scalar()
                print('stops count =', cnt)
            except Exception as e:
                print('COUNT query failed:', e)
            try:
                res = conn.execute(text('SELECT id,name,latitude,longitude FROM stops LIMIT 5'))
                rows = res.fetchall()
                print('\nSample rows:')
                for r in rows:
                    # convert Row to dict-like representation
                    try:
                        d = dict(r)
                    except Exception:
                        d = {col: getattr(r, col) for col in r.keys()}
                    print(d)
            except Exception as e:
                print('Sample query failed:', e)
    except Exception as e:
        print('Connection or engine creation failed:')
        traceback.print_exc()


if __name__ == '__main__':
    main()
#!/usr/bin/env python3
"""
Script minimal pour tester la connexion à une base MySQL et afficher COUNT + 5 exemples
Usage:
  python dryrun_mysql_stops.py "mysql+pymysql://user:pass@host:3306/db"
"""
import sys
from sqlalchemy import create_engine, text

def main():
    if len(sys.argv) < 2:
        print('Usage: python dryrun_mysql_stops.py <SQLALCHEMY_URI>')
        sys.exit(1)
    uri = sys.argv[1]
    print('Using URI:', uri)
    try:
        engine = create_engine(uri)
        with engine.connect() as conn:
            try:
                cnt = conn.execute(text('SELECT COUNT(*) AS c FROM stops')).scalar()
                print('stops count =', cnt)
            except Exception as e:
                print('count failed:', e)
            try:
                res = conn.execute(text('SELECT id,name,latitude,longitude FROM stops LIMIT 5'))
                for r in res.fetchall():
                    print(dict(r))
            except Exception as e:
                print('sample failed:', e)
    except Exception as e:
        print('Connection failed:', e)

if __name__ == '__main__':
    main()
