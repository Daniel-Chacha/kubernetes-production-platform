
import os
import sqlite3
import sys

import django

SOURCE_DB = "/tmp/taskflow-migration/taskflow-source.sqlite3"

if not os.path.isfile(SOURCE_DB):
    sys.exit(f"SQLite backup not found: {SOURCE_DB}")

# The application code is located at /app in the container.
sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DB_ENGINE"] = "postgres"

django.setup()

from django.db import connection, transaction
from tasks.models import Task


with sqlite3.connect(SOURCE_DB) as source:
    source.row_factory = sqlite3.Row

    integrity = source.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        sys.exit(f"SQLite integrity check failed: {integrity}")

    rows = source.execute(
        """
        SELECT id, title, completed, created_at
        FROM tasks_task
        ORDER BY id
        """
    ).fetchall()

if len(rows) != 13:
    sys.exit(f"Expected 13 source tasks; found {len(rows)}")

with transaction.atomic():
    if Task.objects.exists():
        sys.exit(
            "PostgreSQL tasks table is not empty. "
            "Import aborted to prevent duplicates."
        )

    # Explicit SQL preserves IDs and created_at values exactly.
    with connection.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO tasks_task (id, title, completed, created_at)
            VALUES (%s, %s, %s, %s)
            """,
            [
                (
                    row["id"],
                    row["title"],
                    bool(row["completed"]),
                    row["created_at"],
                )
                for row in rows
            ],
        )

        cursor.execute(
            """
            SELECT setval(
                pg_get_serial_sequence('tasks_task', 'id'),
                (SELECT MAX(id) FROM tasks_task),
                true
            )
            """
        )

    # Verify the imported count before committing.
    if Task.objects.count() != len(rows):
        raise RuntimeError("Imported task count does not match source count")

print(f"Successfully imported {len(rows)} tasks.")
print("IDs, titles, completion states, and timestamps were preserved.")
