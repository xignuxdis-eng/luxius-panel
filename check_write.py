import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()
cur.execute("""
    SELECT especificaciones::jsonb -> 'driveFiles' AS drive_files
    FROM presupuestos
    WHERE id = %s;
""", ('6a3096be-300f-4554-a7a0-e4b619d0db20',))
print(cur.fetchone())
conn.close()