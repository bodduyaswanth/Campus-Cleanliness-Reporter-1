# EcoCampus: Campus Cleanliness Reporter & Recurrence Tracker
**Hackathon Project #42 | Domain: Environment & Sustainability | StudentLife Hack**

A full-stack, accessible application engineering data handling, strict defensive validation, recurring area detection, multi-format exports, and actionable visual summaries. Includes both a **Modern Interactive Web Application** and a **Compliant Python Terminal CLI**.

---

## 🚀 Quick Start

### 1. Launch the Website (Two Options)
- **Direct in Browser:** Simply open [`index.html`](file:///c:/Users/danda/OneDrive/Desktop/yeshwanth/index.html) in Chrome, Edge, or Firefox.
- **Via Local Python Server:**
  ```powershell
  python server.py
  ```
  Then visit `http://localhost:8000` in your web browser.

### 2. Run the Interactive Terminal CLI
```powershell
python cli.py
```

### 3. Generate High-Resolution Matplotlib Charts
```powershell
python generate_charts.py
```
Outputs `campus_analytics_charts.png` with a 4-panel visual distribution.

---

## 🌟 Key Features

| Feature | Web Application (`index.html`) | Terminal CLI (`cli.py`) |
|---|---|---|
| **Role-Based Authentication** | Dedicated sign-in portal (`login.html`), fast 1-click demo profiles, profile dropdown | Interactive user session tracking |
| **Defensive Validation** | Real-time field checks, character counters, regex checks for campus emails | Centralized input loops with type checks and range guards |
| **Recurring Area Engine** | Groups by building & spot, frequency counter, custodial remediation tips | Automated detection of spots reported $\ge 2$ times |
| **Data Persistence** | Dual storage: `localStorage` + `data/reports.json` & `data/reports.csv` | Robust try-except fallback on file read/write |
| **Search & Filtering** | Live multi-field query, building, severity, status, and recurring toggle | Keyword-based matching with clean fixed-width tables |
| **Visual Analytics** | Interactive Chart.js charts (Bar, Donut, Pie, Score distributions) | Matplotlib integration (`campus_analytics_charts.png`) |
| **Multi-Format Exports** | Markdown report (`.md`), Standard CSV (`.csv`), JSON (`.json`), Audit Log (`.txt`) | Markdown, CSV, and plain-text audit logs |
| **Bulk Dataset Ingestion** | Drag-and-drop CSV / JSON file with row-by-row error logs | Schema checking and automated parsing |
| **Threshold Alerts** | Real-time glowing alert banner for SLA breaches and hotspots | ANSI console warning flags |

---

## 📂 Project Directory Structure

```text
├── index.html                  # Modern responsive Web Application UI
├── login.html                  # Campus SSO Authentication & Role Login Page
├── styles.css                  # Custom styling, responsive badges & themes
├── app.js                      # Web application business logic & charts
├── server.py                   # Python HTTP & REST API server
├── cli.py                      # Interactive Terminal CLI with ANSI menus
├── generate_charts.py          # Standalone Matplotlib plotting script
├── campus_analytics_charts.png # Generated high-resolution visual plots
├── start_website.bat           # 1-click Windows launcher
├── data/
│   ├── reports.json            # Seed dataset (35 realistic records)
│   └── reports.csv             # Synchronized CSV dataset
├── CAMPUS_CLEANLINESS_REPORT.md# Generated Executive Markdown summary
└── audit_log.txt               # Chronological audit log
```

---

## 🎓 Hackathon Demo Walkthrough Guide

Follow these steps to demonstrate the application to judges:

1. **Welcome Screen & Overview:** Open the website (`index.html`) to showcase the live KPIs (Total Reports, Active Issues, Average Cleanliness Score, and Recurring Hotspots).
2. **Defensive Input Validation:** Go to the **Submit Report** tab. Attempt submitting with missing or invalid fields to demonstrate the defensive validation errors. Then click **Load Preset Test** and submit.
3. **Recurring Hotspot Detection:** Navigate to **Recurring Hotspots** to highlight spots with $\ge 2$ reports (such as Student Cafeteria and Central Library) with automated custodial remediation tips.
4. **Data Hub & Multi-Format Exports:** Click **Export** in the top bar to download the Executive Markdown report, CSV, or Audit log.
5. **Terminal CLI Demonstration:** Run `python cli.py` in your terminal to demonstrate the ANSI-formatted terminal interface and Matplotlib chart generation.
