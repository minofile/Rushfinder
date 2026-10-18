"""Local-only RushFinder HTTP server; video files are not uploaded."""
import http.server
import socketserver
import webbrowser
import threading

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True

with Server(('127.0.0.1', 0), Handler) as server:
    url = 'http://127.0.0.1:%s/index.html' % server.server_address[1]
    print('RushFinder local: '+url)
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try: server.serve_forever()
    except KeyboardInterrupt: pass
