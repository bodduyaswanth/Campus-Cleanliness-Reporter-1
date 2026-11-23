"""
Campus Cleanliness Reporter - Local Web Server & REST API
StudentLife Hackathon Project #42 | Domain: Environment & Sustainability
"""

import http.server
import socketserver
import json
import os
import csv
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 8000
DATA_JSON_PATH = os.path.join(os.path.dirname(__file__), 'data', 'reports.json')
DATA_CSV_PATH = os.path.join(os.path.dirname(__file__), 'data', 'reports.csv')

def load_reports():
    if not os.path.exists(DATA_JSON_PATH):
        return []
    try:
        with open(DATA_JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON data: {e}")
        return []

def save_reports(reports):
    os.makedirs(os.path.dirname(DATA_JSON_PATH), exist_ok=True)
    with open(DATA_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(reports, f, indent=2)
    
    if reports:
        fieldnames = list(reports[0].keys())
        with open(DATA_CSV_PATH, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in reports:
                writer.writerow(row)

class CleanlinessRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        
        # API: Get all reports
        if parsed.path == '/api/reports':
            reports = load_reports()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(reports).encode('utf-8'))
            return

        # API: Get aggregated summary
        if parsed.path == '/api/summary':
            reports = load_reports()
            total = len(reports)
            active = len([r for r in reports if r.get('status') != 'Resolved'])
            critical = len([r for r in reports if r.get('severity') == 'Critical' and r.get('status') != 'Resolved'])
            avg_score = round(sum(int(r.get('cleanliness_score', 3)) for r in reports) / (total or 1), 2)
            
            # Recurrence detection
            recurrence_map = {}
            for r in reports:
                loc = f"{r.get('building', '')} - {r.get('spot', '')}"
                recurrence_map[loc] = recurrence_map.get(loc, 0) + 1
            hotspots = [{'location': k, 'count': v} for k, v in recurrence_map.items() if v >= 2]

            summary = {
                'total_reports': total,
                'active_issues': active,
                'resolved_issues': total - active,
                'critical_alerts': critical,
                'average_cleanliness_score': avg_score,
                'hotspots': hotspots
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(summary).encode('utf-8'))
            return

        # Fallback to static file server
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/reports':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                new_report = json.loads(body)
                # Validation
                if not new_report.get('building') or not new_report.get('spot'):
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Building and Spot are required.'}).encode('utf-8'))
                    return

                reports = load_reports()
                new_id = f"CR-{1000 + len(reports) + 1}"
                new_report['id'] = new_id
                if not new_report.get('timestamp'):
                    new_report['timestamp'] = datetime.now().isoformat()[:19]
                
                reports.insert(0, new_report)
                save_reports(reports)

                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(new_report).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        super().do_POST()

def run_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), CleanlinessRequestHandler) as httpd:
        print(f"===============================================================")
        print(f"  Campus Cleanliness Reporter Web Server Running!")
        print(f"  URL: http://localhost:{PORT}")
        print(f"  Static files served from: {os.getcwd()}")
        print(f"  REST API available at: http://localhost:{PORT}/api/reports")
        print(f"  Press Ctrl+C to terminate.")
        print(f"===============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == '__main__':
    run_server()
