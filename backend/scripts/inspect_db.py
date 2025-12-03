import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'bus_tracking.db')

def get_tables(conn):
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    return [r[0] for r in cur.fetchall()]

def sample_rows(conn, table, limit=10):
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT * FROM {table} LIMIT {limit}")
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        return {'columns': cols, 'rows': rows}
    except Exception as e:
        return {'error': str(e)}

def table_count(conn, table):
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(1) FROM {table}")
        return cur.fetchone()[0]
    except Exception:
        return None

def main():
    print('DB path:', DB_PATH)
    if not os.path.exists(DB_PATH):
        print('ERROR: DB file not found')
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    tables = get_tables(conn)
    output = {'db_path': DB_PATH, 'tables': {}}

    for t in tables:
        cnt = table_count(conn, t)
        sample = sample_rows(conn, t, limit=10)
        output['tables'][t] = {'count': cnt, 'sample': sample}

    print(json.dumps(output, indent=2, default=str))
    conn.close()

if __name__ == '__main__':
    main()
