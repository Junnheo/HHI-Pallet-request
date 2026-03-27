import http.server
import socketserver
import os
import sys

PORT = 8995
DIRECTORY = os.getcwd()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

print(f"Starting server on port {PORT}...", file=sys.stderr)
try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at 127.0.0.1:{PORT}", file=sys.stderr)
        httpd.serve_forever()
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
