from functools import wraps
from flask import g
import MySQLdb
import app.configs as configs


def _connect_db():
    conn = MySQLdb.connect(
        host=configs.db_host,
        user=configs.db_user,
        passwd=configs.db_pass,
        db=configs.db_name,
        charset=configs.db_charset)
    cursor = conn.cursor(cursorclass=MySQLdb.cursors.DictCursor)
    return conn, cursor


def request_db_connect(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        if hasattr(g, 'conn') and g.conn is not None and hasattr(g, 'cursor') and g.cursor is not None:
            pass
        else:
            (g.conn, g.cursor) = _connect_db()
            print "connect"

        fun = func(*args, **kwargs)

        if hasattr(g, 'conn') and g.conn is not None and hasattr(g, 'cursor') and g.cursor is not None:
            g.cursor.close()
            g.cursor = None
            g.conn.close()
            g.conn = None
            print "close"
        return fun

    return decorated_function
