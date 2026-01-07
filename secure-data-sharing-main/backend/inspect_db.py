import sqlite3
try:
    conn = sqlite3.connect('app.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print('TABLES:', cur.fetchall())
    try:
        cur.execute('SELECT id,username,email FROM users LIMIT 50;')
        rows = cur.fetchall()
        print('USERS_COUNT', len(rows))
        for r in rows:
            print(r)
    except Exception as e:
        print('ERR listing users:', e)
    conn.close()
except Exception as e:
    print('ERR opening DB:', e)
