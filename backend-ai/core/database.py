"""
Database module - Evita importação circular
Contém configuração do pool de conexões e função get_db_connection
"""

import os
import logging
import mysql.connector
from mysql.connector import Error
from DBUtils.PooledDB import PooledDB

logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'tl_waste_monitoring'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port': int(os.getenv('DB_PORT', '3306'))
}

# Database connection pool for better performance
db_pool = PooledDB(
    creator=mysql.connector,
    maxconnections=20,  # Maximum connections in pool
    mincached=2,  # Minimum idle connections
    maxcached=10,  # Maximum idle connections
    maxshared=20,  # Maximum shared connections
    blocking=True,  # Block if no connections available
    ping=1,  # Ping connection before using
    **DB_CONFIG
)

logger.info(f"Database pool initialized: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")


def get_db_connection():
    """Get a database connection from the pool"""
    try:
        connection = db_pool.connection()
        return connection
    except Error as e:
        logger.error(f"Database connection error: {e}")
        return None
