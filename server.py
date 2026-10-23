import os
import mimetypes
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import sys
import json

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/javascript", ".jsx")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("application/pdf", ".pdf")

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class FastPortfolioHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def address_string(self):
        # Prevent any blocking reverse DNS lookup
        return self.client_address[0]

    def log_message(self, format, *args):
        # Quick non-blocking logging
        sys.stderr.write(f"[{self.log_date_time_string()}] {self.client_address[0]} {format % args}\n")

    def translate_path(self, path):
        parsed = urllib.parse.urlparse(path)
        clean = parsed.path.lstrip('/')
        if clean.startswith('Personal-portfolio/'):
            clean = clean[len('Personal-portfolio/'):]
        elif clean == 'Personal-portfolio':
            clean = ''
        if clean == '' or clean.endswith('/'):
            clean = os.path.join(clean, 'index.html')
        target = os.path.join(ROOT_DIR, clean)
        if not os.path.exists(target):
            if clean.startswith('_next/static/chunks/') and clean.endswith('.css'):
                alt = os.path.join(ROOT_DIR, '_next/static/css', os.path.basename(clean))
                if os.path.exists(alt):
                    return alt
                alt2 = os.path.join(ROOT_DIR, 'css', os.path.basename(clean))
                if os.path.exists(alt2):
                    return alt2
        return target
    def end_headers(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path
        if clean_path not in ('/resume.pdf', '/resume'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()


    def do_HEAD(self):
        return self.do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path
        if clean_path == '/api/message':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else b'{}'
            try:
                data = json.loads(body.decode('utf-8'))
                sys.stderr.write(f"[PORTFOLIO MESSAGE RECEIVED]: {data}\n")
            except Exception:
                pass
            response = b'{"ok": true}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            return
        self.send_error(404, "Not Found")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        clean_path = parsed.path
        if clean_path in ('/resume.pdf', '/resume'):
            resume_path = os.path.join(ROOT_DIR, 'resume.pdf')
            if os.path.exists(resume_path):
                try:
                    with open(resume_path, 'rb') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/pdf')
                    self.send_header('Content-Disposition', 'inline; filename="Manzil_Shrestha_Resume.pdf"')
                    self.send_header('Content-Length', str(len(data)))
                    self.send_header('Cache-Control', 'public, max-age=3600')
                    self.end_headers()
                    if self.command != 'HEAD':
                        self.wfile.write(data)
                    return
                except Exception as e:
                    self.send_error(500, f"Error reading resume: {e}")
                    return

        if clean_path in ('', '/', '/index.html', '/Personal-portfolio', '/Personal-portfolio/', '/Personal-portfolio/index.html'):
            try:
                with open(os.path.join(ROOT_DIR, 'index.html'), 'rb') as f:
                    encoded = f.read()

                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(encoded)))
                self.send_header('Connection', 'close')
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(encoded)
                return
            except Exception as e:
                self.send_error(500, f"Error rendering index: {e}")
                return

        return super().do_GET()

def run(port=3000):
    ThreadingHTTPServer.daemon_threads = True
    ThreadingHTTPServer.allow_reuse_address = True
    server_address = ('0.0.0.0', port)
    httpd = ThreadingHTTPServer(server_address, FastPortfolioHandler)
    print(f"Serving Portfolio on http://0.0.0.0:{port} with ThreadingHTTPServer...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
    run(port)
