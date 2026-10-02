import sys
sys.path.insert(0, 'scripts')
import sync_r2_to_drive as s

conn = s.get_db_connection()
cur = conn.cursor()
cur.execute("""
    SELECT id, especificaciones::jsonb -> 'archivos' AS archivos
    FROM presupuestos
    WHERE especificaciones::jsonb ? 'archivos'
      AND jsonb_array_length(especificaciones::jsonb -> 'archivos') > 0
    LIMIT 5;
""")
for row in cur.fetchall():
    print(row)
conn.close()