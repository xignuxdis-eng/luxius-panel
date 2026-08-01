import http.server
import socketserver
import os

DIST_DIR = os.path.join(os.path.dirname(__file__), 'dist')
FRONTEND_DIST = r'F:\Diseños\Xignux\stitch_xignux_workfield_manager\stitch_xignux_workfield_manager\dist'

if not os.path.isdir(DIST_DIR):
    if os.path.isdir(FRONTEND_DIST):
        DIST_DIR = FRONTEND_DIST
    else:
        print(f'ERROR: Carpeta dist/ no encontrada en {DIST_DIR}')
        print('Ejecutá primero: npm run build')
        exit(1)
PORT = 8080

if not os.path.isdir(DIST_DIR):
    print(f'ERROR: Carpeta dist/ no encontrada en {DIST_DIR}')
    print('Ejecutá primero: npm run build')
    exit(1)

os.chdir(DIST_DIR)

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

NoCacheHandler.extensions_map.update({
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
})

with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    print(f'Frontend XignuX Workfield (no-cache) sirviendo dist/ en http://localhost:{PORT}')
    print('Presioná Ctrl+C para detener')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nServidor detenido')
