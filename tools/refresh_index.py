#!/usr/bin/env python3
"""
Refresh INDEX.html using KPIs computed from an Excel file.
Usage:
  python3 tools/refresh_index.py path/to/Soha-Usage-Price-updated.xlsx public/INDEX.html
"""
import sys, re, json
from pathlib import Path
import pandas as pd, numpy as np

def fmt_money(x): return "${:,.0f}".format(x)
def fmt_money_compact(x):
    if x >= 1_000_000: return "${:.2f}M".format(x/1_000_000)
    if x >= 1_000: return "${:.1f}K".format(x/1_000)
    return "${:,.0f}".format(x)
def fmt_pct(x): return f"{x:.0f}%"

def compute_metrics(xlsx_path):
    xls = pd.ExcelFile(xlsx_path)
    usage = xls.parse("Usage-Price")
    for c in ['No of Report download','No of Call','No. Participants Attended Gartner Conferences','Year1 Cost','Year2 Cost','Year3 Cost','Total Cost (3 Years)']:
        usage[c] = pd.to_numeric(usage[c], errors='coerce').fillna(0)
    k = {}
    k['users'] = int(usage.shape[0])
    k['reports'] = int(usage['No of Report download'].sum())
    k['calls'] = int(usage['No of Call'].sum())
    k['conf'] = int(usage['No. Participants Attended Gartner Conferences'].sum())
    k['cost3'] = float(usage['Total Cost (3 Years)'].sum())
    k['cost_per_report'] = float(k['cost3']/k['reports']) if k['reports'] else np.nan
    active = (usage['No of Report download'] + usage['No of Call'] + usage['No. Participants Attended Gartner Conferences'] > 0).mean()
    k['active_rate'] = round(active*100, 1)
    gartner = xls.parse("Gartner Std Cost")
    cost_map = dict(zip(gartner.iloc[:,1], gartner['Cost']))
    k['std_value'] = k['reports']*float(cost_map.get('Report',4000)) + k['calls']*float(cost_map.get('Call',1000)) + k['conf']*float(cost_map.get('Conference',1500))
    k['roi'] = k['std_value']/k['cost3'] if k['cost3'] else np.nan
    survey = xls.parse("38 Survey Responses")
    import re as _re
    def score(x):
        m = _re.search(r'\((\d+)\)', str(x))
        return int(m.group(1)) if m else np.nan
    survey['Q1_score'] = survey['Q1_Overall_Usefulness'].map(score)
    k['q1_avg'] = float(survey['Q1_score'].mean())
    k['q1_n'] = int(survey['Q1_score'].notna().sum())
    return k

def update_html(html_path, k):
    html = Path(html_path).read_text(encoding='utf-8', errors='ignore')
    # Tabs fix
    html = re.sub(r"onclick=\"showTab\('([^']+)'\)\"", r"onclick=\"showTab('\1', event)\"", html)
    html = re.sub(r"function\s+showTab\s*\(\s*tabName\s*\)", "function showTab(tabName, evt)", html)
    html = html.replace("event.target.classList.add('active');", "if (evt && evt.target) evt.target.classList.add('active');")

    # KPI replacements by label
    html = re.sub(r'(<div class="metric-card">\s*<div class="metric-value">)(.*?)(</div>\s*<div class="metric-label">\s*Licensed Users\s*</div>)', rf'\g<1>{k["users"]}\g<3>', html, flags=re.DOTALL)
    html = re.sub(r'(<div class="metric-card">\s*<div class="metric-value">)(.*?)(</div>\s*<div class="metric-label">\s*Active Utilization Rate\s*</div>)', rf'\g<1>{fmt_pct(k["active_rate"])}\g<3>', html, flags=re.DOTALL)
    html = re.sub(r'(<div class="metric-card">\s*<div class="metric-value">)(.*?)(</div>\s*<div class="metric-label">\s*Cost per Download\s*</div>)', rf'\g<1>{fmt_money(round(k["cost_per_report"]))}\g<3>', html, flags=re.DOTALL)
    html = re.sub(r">(.*?)</h4>\s*<p><strong>Total 3-Year Spend</strong></p>", f">{fmt_money_compact(k['cost3'])}</h4>\\n                        <p><strong>Total 3-Year Spend</strong></p>", html, count=1, flags=re.DOTALL)

    # Narrative numbers
    html = re.sub(r"(Document Downloads:</strong>\s*)[\\d,]+", lambda m: f"{m.group(1)}{k['reports']:,}", html)
    html = re.sub(r"(Analyst Calls:</strong>\s*)[\\d,]+",      lambda m: f"{m.group(1)}{k['calls']:,}", html)
    html = re.sub(r"(Conference Sessions:</strong>\s*)[\\d,]+",lambda m: f"{m.group(1)}{k['conf']:,}", html)

    # Insights lines
    html = re.sub(r"✅ YES - Strong Value Perception.*?<br>", f"✅ YES — Avg usefulness score: <strong>{k['q1_avg']:.2f}/5</strong> from <strong>{k['q1_n']}</strong> responses<br>", html, flags=re.DOTALL)
    html = re.sub(r"(Estimated ROI:)\s*<strong>.*?</strong>", rf"\\1 <strong>{k['roi']:.2f}×</strong>", html)

    Path(html_path).write_text(html, encoding='utf-8')

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(1)
    xlsx, html = sys.argv[1], sys.argv[2]
    k = compute_metrics(xlsx)
    update_html(html, k)
    print("Updated", html, "with KPIs:", json.dumps(k, indent=2))

if __name__ == "__main__":
    main()
