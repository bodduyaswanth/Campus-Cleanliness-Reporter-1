"""
Campus Cleanliness Reporter - Visual Data Plotting Module
Generates publication-quality charts using Matplotlib.
StudentLife Hackathon Project #42 | Domain: Environment & Sustainability
"""

import os
import json
import matplotlib
import matplotlib.pyplot as plt
import numpy as np

# Set headless backend for server/CLI environments
matplotlib.use('Agg')

def load_data(filepath='data/reports.json'):
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def generate_analytics_charts(output_path='campus_analytics_charts.png'):
    data = load_data()
    if not data:
        print("No reports found to plot.")
        return

    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('Campus Cleanliness Reporter - Visual Analytics & Trend Distribution\nStudentLife Hackathon #42', fontsize=15, fontweight='bold', y=0.98)

    # 1. Recurring Problem Areas (Bar Chart)
    building_counts = {}
    for r in data:
        b = r.get('building', 'Unknown')
        building_counts[b] = building_counts.get(b, 0) + 1

    sorted_buildings = sorted(building_counts.items(), key=lambda x: x[1], reverse=True)[:6]
    b_names = [b[0] for b in sorted_buildings]
    b_vals = [b[1] for b in sorted_buildings]

    ax1 = axes[0, 0]
    bars1 = ax1.barh(b_names, b_vals, color='#10b981', edgecolor='#047857')
    ax1.set_title('Top Reported Problem Locations', fontweight='bold', fontsize=12)
    ax1.set_xlabel('Number of Cleanliness Reports')
    ax1.invert_yaxis()
    ax1.grid(axis='x', linestyle='--', alpha=0.6)
    for bar in bars1:
        ax1.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2, f"{int(bar.get_width())}", 
                 va='center', fontsize=9, fontweight='bold', color='#1e293b')

    # 2. Category Breakdown (Pie / Donut)
    cat_counts = {}
    for r in data:
        c = r.get('category', 'Other')
        cat_counts[c] = cat_counts.get(c, 0) + 1

    sorted_cats = sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
    c_labels = [c[0] for c in sorted_cats]
    c_vals = [c[1] for c in sorted_cats]
    colors = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#64748b']

    ax2 = axes[0, 1]
    wedges, texts, autotexts = ax2.pie(c_vals, labels=c_labels, autopct='%1.1f%%',
                                       startangle=140, colors=colors[:len(c_vals)],
                                       wedgeprops=dict(width=0.45, edgecolor='w'))
    plt.setp(autotexts, size=8, weight="bold")
    plt.setp(texts, size=8)
    ax2.set_title('Cleanliness Issue Categories', fontweight='bold', fontsize=12)

    # 3. Cleanliness Score Ratings (Histogram / Bar 1 to 5)
    scores = [int(r.get('cleanliness_score', 3)) for r in data]
    score_counts = [scores.count(i) for i in range(1, 6)]
    score_labels = ['1\nCritical', '2\nPoor', '3\nFair', '4\nGood', '5\nSpotless']
    score_colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#059669']

    ax3 = axes[1, 0]
    bars3 = ax3.bar(score_labels, score_counts, color=score_colors, edgecolor='#334155', width=0.55)
    ax3.set_title('Campus Cleanliness Ratings Distribution', fontweight='bold', fontsize=12)
    ax3.set_ylabel('Report Frequency')
    ax3.set_xlabel('Rating Score (1=Critical, 5=Spotless)')
    ax3.grid(axis='y', linestyle='--', alpha=0.5)
    for bar in bars3:
        ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.15, f"{int(bar.get_height())}", 
                 ha='center', fontsize=9, fontweight='bold')

    # 4. Severity Distribution (Stacked Bar by Status)
    severities = ['Critical', 'High', 'Medium', 'Low']
    status_resolved = [0, 0, 0, 0]
    status_active = [0, 0, 0, 0]

    for r in data:
        sev = r.get('severity', 'Medium')
        if sev in severities:
            idx = severities.index(sev)
            if r.get('status') == 'Resolved':
                status_resolved[idx] += 1
            else:
                status_active[idx] += 1

    ax4 = axes[1, 1]
    p1 = ax4.bar(severities, status_active, label='Active / Pending', color='#ef4444', width=0.5)
    p2 = ax4.bar(severities, status_resolved, bottom=status_active, label='Resolved', color='#10b981', width=0.5)
    ax4.set_title('Severity Breakdown & Resolution Status', fontweight='bold', fontsize=12)
    ax4.set_ylabel('Number of Reports')
    ax4.legend(loc='upper right', fontsize=9)
    ax4.grid(axis='y', linestyle='--', alpha=0.5)

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig(output_path, dpi=200, bbox_inches='tight')
    plt.close()
    print(f"[SUCCESS] Exported high-resolution analytics chart to: {output_path}")

if __name__ == '__main__':
    generate_analytics_charts()
