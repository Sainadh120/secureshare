"""
Database migration script to add new columns for E2E encryption support.
Run this script once to update the existing database schema.
"""

import sqlite3
import os

# Get the database path
db_path = os.path.join(os.path.dirname(__file__), "app.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if public_key column exists in users table
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]
    
    if 'public_key' not in user_columns:
        print("Adding 'public_key' column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN public_key TEXT")
        conn.commit()
        print("Done.")
    else:
        print("'public_key' column already exists in users table.")

    # Check if encrypted_aes_key column exists in data_access_permissions table
    cursor.execute("PRAGMA table_info(data_access_permissions)")
    perm_columns = [col[1] for col in cursor.fetchall()]
    
    if 'encrypted_aes_key' not in perm_columns:
        print("Adding 'encrypted_aes_key' column to data_access_permissions table...")
        cursor.execute("ALTER TABLE data_access_permissions ADD COLUMN encrypted_aes_key TEXT")
        conn.commit()
        print("Done.")
    else:
        print("'encrypted_aes_key' column already exists in data_access_permissions table.")

    if 'shared_at' not in perm_columns:
        print("Adding 'shared_at' column to data_access_permissions table...")
        cursor.execute("ALTER TABLE data_access_permissions ADD COLUMN shared_at DATETIME DEFAULT CURRENT_TIMESTAMP")
        conn.commit()
        print("Done.")
    else:
        print("'shared_at' column already exists in data_access_permissions table.")

    conn.close()
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
