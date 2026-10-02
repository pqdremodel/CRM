import http.server
import socketserver

class ThreadingSimpleServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

import sys
import os

if __name__ == '__main__':
    port = 8080
    os.chdir('/Users/officeassistant/CRM')
    server = ThreadingSimpleServer(('', port), http.server.SimpleHTTPRequestHandler)
    print(f"Serving on port {port} (Multi-threaded)")
    server.serve_forever()
