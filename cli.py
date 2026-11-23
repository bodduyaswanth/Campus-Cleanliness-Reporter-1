#!/usr/bin/env python3
"""
=============================================================================
 Campus Cleanliness Reporter - Interactive Terminal Application (CLI)
 Project #42 | Domain: Environment & Sustainability | StudentLife Hackathon
=============================================================================
"""

import os
import sys
import json
import csv
import re
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict

# Set Matplotlib headless cache directory defensively
os.environ.setdefault('MPLCONFIGDIR', os.path.join(os.path.dirname(__file__), '.mpl_cache'))

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
REPORTS_JSON = os.path.join(DATA_DIR, 'reports.json')
REPORTS_CSV = os.path.join(DATA_DIR, 'reports.csv')

# ANSI Color Codes for Clean Terminal Presentation
class Color:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    RED = '\033[31m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    MAGENTA = '\033[35m'
    GRAY = '\033[90m'

@dataclass
class CleanlinessReport:
    id: str
    timestamp: str
    zone: str
    building: str
    spot: str
    category: str
    cleanliness_score: int
    severity: str
    description: str
    reporter_name: str
    reporter_role: str
    reporter_email: str
    status: str = "Reported"
    assigned_to: str = "Pending Assignment"
    sla_hours: int = 24
    resolved_at: Optional[str] = None
    notes: str = ""

# ==========================================
# DEFENSIVE PERSISTENCE ROUTINES
# ==========================================

def load_reports() -> List[CleanlinessReport]:
    """Reads structured records from JSON with defensive fallback."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(REPORTS_JSON):
        # Create empty initial template if file doesn't exist
        print(f"{Color.YELLOW}[INFO] Storage file missing. Initializing empty dataset at {REPORTS_JSON}{Color.RESET}")
        save_reports([])
        return []

    try:
        with open(REPORTS_JSON, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [CleanlinessReport(**row) for row in data]
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"{Color.RED}[ERROR] Corrupted JSON file detected ({e}). Backing up and generating clean template.{Color.RESET}")
        backup_name = f"{REPORTS_JSON}.corrupt_{int(datetime.now().timestamp())}"
        try:
            os.rename(REPORTS_JSON, backup_name)
            print(f"{Color.GRAY}Preserved damaged file to: {backup_name}{Color.RESET}")
        except Exception:
            pass
        return []

def save_reports(reports: List[CleanlinessReport]):
    """Persists records atomically to both JSON and standard CSV files."""
    os.makedirs(DATA_DIR, exist_ok=True)
    dict_list = [asdict(r) for r in reports]

    # 1. Save JSON
    with open(REPORTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(dict_list, f, indent=2)

    # 2. Save CSV
    if dict_list:
        fieldnames = list(dict_list[0].keys())
        with open(REPORTS_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in dict_list:
                writer.writerow(row)

# ==========================================
# DEFENSIVE INPUT VALIDATION WRAPPERS
# ==========================================

def prompt_string(prompt_text: str, min_len: int = 1, max_len: int = 200, default: str = "") -> str:
    """Loops defensively until user inputs a sanitized string within length limits."""
    while True:
        try:
            default_display = f" [{default}]" if default else ""
            user_input = input(f"{prompt_text}{default_display}: ").strip()
            if not user_input and default:
                return default
            if len(user_input) < min_len:
                print(f"{Color.RED}Input too short. Minimum length is {min_len} characters.{Color.RESET}")
                continue
            if len(user_input) > max_len:
                print(f"{Color.RED}Input too long. Maximum length is {max_len} characters.{Color.RESET}")
                continue
            return user_input
        except (KeyboardInterrupt, EOFError):
            print("\nOperation cancelled.")
            sys.exit(0)

def prompt_int_range(prompt_text: str, min_val: int, max_val: int, default: Optional[int] = None) -> int:
    """Defensive input wrapper ensuring numeric input within bounded range."""
    while True:
        try:
            default_display = f" [{default}]" if default is not None else ""
            raw = input(f"{prompt_text}{default_display}: ").strip()
            if not raw and default is not None:
                return default
            val = int(raw)
            if min_val <= val <= max_val:
                return val
            print(f"{Color.RED}Value out of range! Enter a number between {min_val} and {max_val}.{Color.RESET}")
        except ValueError:
            print(f"{Color.RED}Invalid input. Please enter a valid whole number.{Color.RESET}")
        except (KeyboardInterrupt, EOFError):
            print("\nOperation cancelled.")
            sys.exit(0)

def prompt_choice(prompt_text: str, options: List[str], default_idx: int = 0) -> str:
    """Presents a list of options and defensively collects a valid choice."""
    print(prompt_text)
    for idx, opt in enumerate(options, 1):
        indicator = " (default)" if (idx - 1) == default_idx else ""
        print(f"  {Color.CYAN}[{idx}]{Color.RESET} {opt}{indicator}")
    
    choice = prompt_int_range("Select an option", 1, len(options), default=default_idx + 1)
    return options[choice - 1]

def prompt_email(prompt_text: str, default: str = "") -> str:
    """Validates email format using defensive regex."""
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    while True:
        email = prompt_string(prompt_text, min_len=5, default=default)
        if re.match(pattern, email):
            return email
        print(f"{Color.RED}Invalid email structure. Example: user@campus.edu{Color.RESET}")

# ==========================================
# CORE BUSINESS LOGIC & RECURRENCE ENGINE
# ==========================================

def calculate_recurrence(reports: List[CleanlinessReport]) -> Dict[str, dict]:
    """
    Computes recurrence of cleanliness reports by location.
    Flags spots with >= 2 reports as chronic recurring problem areas.
    """
    hotspots = {}
    for r in reports:
        key = f"{r.building.strip()} - {r.spot.strip()}"
        if key not in hotspots:
            hotspots[key] = {
                'building': r.building,
                'spot': r.spot,
                'zone': r.zone,
                'count': 0,
                'active_count': 0,
                'categories': set(),
                'severities': []
            }
        hotspots[key]['count'] += 1
        hotspots[key]['categories'].add(r.category)
        hotspots[key]['severities'].append(r.severity)
        if r.status != 'Resolved':
            hotspots[key]['active_count'] += 1
    return hotspots

# ==========================================
# INTERACTIVE CLI ACTION HANDLERS
# ==========================================

def action_record_report(reports: List[CleanlinessReport]):
    """Menu Item 1: Record Cleanliness Report with Defensive Validation."""
    print(f"\n{Color.BOLD}{Color.GREEN}=== RECORD NEW CLEANLINESS REPORT ==={Color.RESET}")
    print(f"{Color.GRAY}All inputs are validated in real-time against domain bounds.{Color.RESET}\n")

    zones = ["North Campus", "Central Campus", "Science Quad", "Engineering Quad", "Hostel Zone", "Sports & Recreation", "Admin Block"]
    zone = prompt_choice("Select Campus Zone:", zones)

    building = prompt_string("Enter Building Name (e.g. Student Cafeteria)", min_len=3, max_len=60)
    spot = prompt_string("Enter Specific Spot / Room (e.g. Ground Floor Dish Drop Area)", min_len=3, max_len=80)

    categories = [
        "Overflowing Bins", "Liquid Spills", "Restroom Sanitization",
        "Food Waste", "Litter/Debris", "Hazardous/Chemical",
        "Plumbing/Leak", "Pest Control", "Broken Fixtures"
    ]
    category = prompt_choice("Select Issue Category:", categories)

    print(f"\nCleanliness Rating Scale:")
    print("  1 = Critical / Hazardous Slip Risk")
    print("  2 = Poor Hygiene / Foul Odor")
    print("  3 = Fair / Minor Accumulation")
    print("  4 = Good Hygiene")
    print("  5 = Spotless Clean")
    score = prompt_int_range("Rate Cleanliness Score (1 to 5)", 1, 5, default=2)

    severities = ["Low", "Medium", "High", "Critical"]
    severity = prompt_choice("Select Urgency / Severity Level:", severities, default_idx=1)

    description = prompt_string("Incident Description", min_len=10, max_len=300)
    reporter_name = prompt_string("Reporter Full Name", min_len=2, max_len=50)

    roles = ["Student", "Faculty", "Staff", "Lab Assistant", "Visitor"]
    reporter_role = prompt_choice("Reporter Role:", roles)

    reporter_email = prompt_email("Reporter Campus Email")

    # SLA map
    sla_map = {'Critical': 4, 'High': 8, 'Medium': 16, 'Low': 48}
    sla_hours = sla_map.get(severity, 24)

    new_id = f"CR-{1000 + len(reports) + 1}"
    new_report = CleanlinessReport(
        id=new_id,
        timestamp=datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        zone=zone,
        building=building,
        spot=spot,
        category=category,
        cleanliness_score=score,
        severity=severity,
        description=description,
        reporter_name=reporter_name,
        reporter_role=reporter_role,
        reporter_email=reporter_email,
        status="Reported",
        assigned_to="Custodial Triage",
        sla_hours=sla_hours,
        resolved_at=None,
        notes=""
    )

    reports.insert(0, new_report)
    save_reports(reports)

    print(f"\n{Color.GREEN}{Color.BOLD}[SUCCESS] Cleanliness report logged with ID: {new_id}{Color.RESET}")

    # Check for recurrence trigger
    hotspots = calculate_recurrence(reports)
    key = f"{building.strip()} - {spot.strip()}"
    if hotspots.get(key, {}).get('count', 0) >= 2:
        count = hotspots[key]['count']
        print(f"{Color.RED}{Color.BOLD}[RECURRENCE ALERT] Location '{key}' has been reported {count} times!{Color.RESET}")
        print(f"{Color.YELLOW}Recommended Action: Flag for deep custodial sweep and facilities inspection.{Color.RESET}")

def action_query_reports(reports: List[CleanlinessReport]):
    """Menu Item 2: Query & Search Reports with Filters."""
    print(f"\n{Color.BOLD}{Color.CYAN}=== RECORD QUERY & SEARCH ==={Color.RESET}")
    keyword = prompt_string("Enter search keyword (or press Enter to view all)", min_len=0, default="").lower()

    matches = []
    for r in reports:
        if not keyword or (
            keyword in r.id.lower() or
            keyword in r.building.lower() or
            keyword in r.spot.lower() or
            keyword in r.category.lower() or
            keyword in r.reporter_name.lower() or
            keyword in r.description.lower()
        ):
            matches.append(r)

    print(f"\nFound {len(matches)} matching report(s):\n")
    print(f"{'ID':<9} {'SEVERITY':<10} {'STATUS':<13} {'SCORE':<7} {'LOCATION / SPOT':<40} {'CATEGORY'}")
    print("-" * 95)
    for r in matches[:25]:
        loc = f"{r.building} ({r.spot})"
        if len(loc) > 38: loc = loc[:35] + "..."
        sev_color = Color.RED if r.severity == 'Critical' else (Color.YELLOW if r.severity == 'High' else Color.RESET)
        print(f"{r.id:<9} {sev_color}{r.severity:<10}{Color.RESET} {r.status:<13} {r.cleanliness_score}/5   {loc:<40} {r.category}")

    if len(matches) > 25:
        print(f"{Color.GRAY}... and {len(matches) - 25} more records. Narrow query with specific keywords.{Color.RESET}")

def action_recurring_areas_summary(reports: List[CleanlinessReport]):
    """Menu Item 3: Core Computational Engine - Summarize Recurring Problem Areas."""
    print(f"\n{Color.BOLD}{Color.MAGENTA}=== CHRONIC RECURRING PROBLEM AREAS SUMMARY ==={Color.RESET}")
    print(f"{Color.GRAY}Locations with 2 or more logged complaints flagged by recurrence engine.{Color.RESET}\n")

    hotspots = calculate_recurrence(reports)
    chronic = [v for v in hotspots.values() if v['count'] >= 2]
    chronic.sort(key=lambda x: x['count'], reverse=True)

    if not chronic:
        print(f"{Color.GREEN}Great news! No recurring problem areas detected on campus.{Color.RESET}")
        return

    print(f"{'LOCATION (BUILDING & SPOT)':<45} {'OCCURRENCES':<13} {'ACTIVE':<9} {'COMMON CATEGORIES'}")
    print("=" * 95)
    for h in chronic:
        loc = f"{h['building']} - {h['spot']}"
        if len(loc) > 43: loc = loc[:40] + "..."
        cats = ", ".join(list(h['categories'])[:2])
        print(f"{Color.BOLD}{loc:<45}{Color.RESET} {Color.RED}{h['count']} reports{Color.RESET}   {h['active_count']:<9} {cats}")

    print(f"\n{Color.YELLOW}[THRESHOLD WARNING] {len(chronic)} campus spot(s) exceed repeat incident thresholds.{Color.RESET}")

def action_executive_summary(reports: List[CleanlinessReport]):
    """Menu Item 4: Executive Performance Metrics Summary."""
    print(f"\n{Color.BOLD}{Color.GREEN}=== EXECUTIVE PERFORMANCE SUMMARY ==={Color.RESET}")
    total = len(reports)
    if total == 0:
        print("No reports recorded yet.")
        return

    active = len([r for r in reports if r.status != 'Resolved'])
    resolved = total - active
    res_rate = round((resolved / total) * 100, 1)
    avg_score = round(sum(r.cleanliness_score for r in reports) / total, 2)
    critical_active = len([r for r in reports if r.severity == 'Critical' and r.status != 'Resolved'])

    hotspots = calculate_recurrence(reports)
    hotspot_count = len([v for v in hotspots.values() if v['count'] >= 2])

    print(f"Total Cleanliness Reports Logged : {Color.BOLD}{total}{Color.RESET}")
    print(f"Active Unresolved Complaints     : {Color.YELLOW}{active}{Color.RESET}")
    print(f"Resolved Issues                  : {Color.GREEN}{resolved} ({res_rate}%){Color.RESET}")
    print(f"Campus Average Cleanliness Index : {Color.CYAN}{avg_score} / 5.0{Color.RESET}")
    print(f"Critical SLA Breaches Active     : {Color.RED}{critical_active}{Color.RESET}")
    print(f"Recurring Hotspots Flagged       : {Color.MAGENTA}{hotspot_count}{Color.RESET}")

def action_generate_plots():
    """Menu Item 5: Visual Data Plotting with Matplotlib."""
    print(f"\n{Color.CYAN}[PLOTTING] Generating Matplotlib visual trend charts...{Color.RESET}")
    try:
        from generate_charts import generate_analytics_charts
        output_file = 'campus_analytics_charts.png'
        generate_analytics_charts(output_file)
        print(f"{Color.GREEN}[SUCCESS] High-resolution charts generated: {output_file}{Color.RESET}")
    except Exception as e:
        print(f"{Color.RED}[ERROR] Plotting failed: {e}{Color.RESET}")

def action_export_multiformat(reports: List[CleanlinessReport]):
    """Menu Item 6: Multi-format Summary Export (Markdown, CSV, Audit Log)."""
    print(f"\n{Color.BOLD}=== MULTI-FORMAT SUMMARY EXPORT ==={Color.RESET}")
    
    # Export Markdown
    md_path = 'CAMPUS_CLEANLINESS_REPORT.md'
    total = len(reports)
    active = len([r for r in reports if r.status != 'Resolved'])
    avg_score = round(sum(r.cleanliness_score for r in reports) / (total or 1), 2)
    hotspots = calculate_recurrence(reports)
    chronic = [v for v in hotspots.values() if v['count'] >= 2]

    with open(md_path, 'w', encoding='utf-8') as f:
        f.write("# Campus Cleanliness Reporter - Executive Summary\n\n")
        f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("## 1. Executive Performance Metrics\n\n")
        f.write(f"- **Total Reports:** {total}\n")
        f.write(f"- **Active Unresolved:** {active}\n")
        f.write(f"- **Average Cleanliness Score:** {avg_score} / 5.0\n")
        f.write(f"- **Flagged Recurring Problem Areas:** {len(chronic)}\n\n")
        f.write("## 2. Chronic Problem Areas (Frequency >= 2)\n\n")
        f.write("| Building & Spot | Incidents | Active Issues |\n|---|---|---|\n")
        for h in chronic:
            f.write(f"| {h['building']} - {h['spot']} | {h['count']} | {h['active_count']} |\n")
        f.write("\n## 3. Incident Audit Register\n\n")
        f.write("| ID | Location | Category | Score | Severity | Status |\n|---|---|---|---|---|---|\n")
        for r in reports[:35]:
            f.write(f"| {r.id} | {r.building} ({r.spot}) | {r.category} | {r.cleanliness_score}/5 | {r.severity} | {r.status} |\n")

    print(f"{Color.GREEN}[OK] Exported Markdown Summary -> {md_path}{Color.RESET}")

    # Export Audit Log
    log_path = 'audit_log.txt'
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write("CAMPUS CLEANLINESS REPORTER - AUDIT ACTION LOG\n")
        f.write(f"Generated: {datetime.now().isoformat()}\n\n")
        for r in reports:
            f.write(f"[{r.timestamp}] ID:{r.id} | {r.severity:<8} | {r.status:<11} | Score:{r.cleanliness_score} | {r.building} - {r.spot}\n")

    print(f"{Color.GREEN}[OK] Exported Plain-text Audit Log -> {log_path}{Color.RESET}")
    print(f"{Color.GREEN}[OK] Structured CSV already synchronized -> {REPORTS_CSV}{Color.RESET}")

# ==========================================
# PRIMARY DISPATCH LOOP
# ==========================================

def display_welcome_banner():
    banner = f"""{Color.GREEN}{Color.BOLD}
=============================================================================
         CAMPUS CLEANLINESS REPORTER & RECURRENCE TRACKER
       Project #42 | Domain: Environment & Sustainability 
                    StudentLife Hackathon
============================================================================={Color.RESET}"""
    print(banner)

def main():
    display_welcome_banner()
    reports = load_reports()
    print(f"{Color.CYAN}[SYSTEM READY] Loaded {len(reports)} records from persistence storage.{Color.RESET}")

    while True:
        print(f"\n{Color.BOLD}MAIN NAVIGATION DISPATCH MENU:{Color.RESET}")
        print(f"  {Color.GREEN}[1]{Color.RESET} Record New Cleanliness Report (Defensively Validated)")
        print(f"  {Color.GREEN}[2]{Color.RESET} Query & Search Cleanliness Records by Keyword")
        print(f"  {Color.GREEN}[3]{Color.RESET} Summarize Chronic Recurring Problem Areas (Hotspots)")
        print(f"  {Color.GREEN}[4]{Color.RESET} Generate Executive Performance Summary & Metrics")
        print(f"  {Color.GREEN}[5]{Color.RESET} Export Visual Analytics Charts (Matplotlib .PNG)")
        print(f"  {Color.GREEN}[6]{Color.RESET} Export Multi-Format Summary (Markdown, CSV, Audit Log)")
        print(f"  {Color.GREEN}[7]{Color.RESET} Launch / View Web Application in Browser")
        print(f"  {Color.RED}[0]{Color.RESET} Exit Application")

        choice = prompt_int_range("Select an action [0-7]", 0, 7)

        if choice == 1:
            action_record_report(reports)
        elif choice == 2:
            action_query_reports(reports)
        elif choice == 3:
            action_recurring_areas_summary(reports)
        elif choice == 4:
            action_executive_summary(reports)
        elif choice == 5:
            action_generate_plots()
        elif choice == 6:
            action_export_multiformat(reports)
        elif choice == 7:
            print(f"\n{Color.CYAN}To view the modern interactive web application:{Color.RESET}")
            print(f"  1. Start the server by running: {Color.BOLD}python server.py{Color.RESET}")
            print(f"  2. Open your browser at: {Color.BOLD}http://localhost:8000{Color.RESET}")
            print(f"  Or simply double click {Color.BOLD}index.html{Color.RESET} to open it immediately in any browser!")
        elif choice == 0:
            print(f"\n{Color.GREEN}Thank you for supporting campus cleanliness! Goodbye.{Color.RESET}")
            break

if __name__ == '__main__':
    main()
