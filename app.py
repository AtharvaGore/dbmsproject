from flask import Flask, render_template
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME", "maindb"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
}

connection_pool = pool.SimpleConnectionPool(1, 10, **DB_CONFIG)


def get_connection():
    return connection_pool.getconn()


def release_connection(conn):
    connection_pool.putconn(conn)


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
