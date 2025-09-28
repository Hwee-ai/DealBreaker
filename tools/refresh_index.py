#!/usr/bin/env python3
import sys, re, json
from pathlib import Path
import pandas as pd, numpy as np

def money_millions(x): return f"${float(x)/1_000_000:.2f}M"
def money(x):
    try: return "${:,.0f}".format(float(x))
    except: return "-"
def pct(x): return f"{float(x):.1f}%"

def compute_all(xlsx_path):
    xls = pd.ExcelFile(xlsx_path)
    contract = xls.parse("Contract APV and Spend")
    usage = xls.parse("Usage-Price")
    survey = xls.parse("38 Survey Responses")

    def row_val(name, col):
        row = contract[contract['Unnamed: 0'] == name]
        return float(row.iloc[0][col]) if not row.empty and pd.notna(row.iloc[0][col]) else np.nan

    total_cost_3y = row_val('Total Cost','Total 3 Years')
    apv_total = row_val('Contract APV','Total 3 Years')
    gt_y1 = row_val('GovTech Cost','Year 1'); gt_y2 = row_val('GovTech Cost','Year 2')
    sg_y1 = row_val('SNG Cost','Year 1'); sg_y2 = row_val('SNG Cost','Year 2')
    spent_20m = (gt_y1 + sg_y1) + (gt_y2 + sg_y2) * (8/12)
    pct_apv_20m = (spent_20m / apv_total * 100.0) if apv_total else np.nan

    # usage numerics
    for c in ['No of Report download','No of Call','No. Participants Attended Gartner Conferences','Total Cost (3 Years)']:
        if c in usage.columns: usage[c] = pd.to_numeric(usage[c], errors='coerce').fillna(0)

    licensed_users = int(usage.shape[0])
    downloads = int(usage['No of Report download'].sum())
    total_cost_users_sum = float(usage['Total Cost (3 Years)'].sum())
    cost_per_download = total_cost_users_sum / downloads if downloads else float('nan')

    # survey
    def score(x):
        m = re.search(r'(\d+)', str(x))
        return int(m.group(1)) if m else np.nan
    avg_survey = float(pd.to_numeric(survey['Q1_Overall_Usefulness'].map(score), errors='coerce').mean())

    # top users (20m) with conferences
    u = usage.copy()
    u['total_interactions'] = u['No of Report download'] + u['No of Call'] + u['No. Participants Attended Gartner Conferences']
    u['monthly_avg'] = (u['total_interactions'] / 20.0).round(1)
    name_col = 'Licensed User Name (2)' if 'Licensed User Name (2)' in u.columns else u.columns[0]
    top_users = u[[name_col,'No of Report download','No of Call','No. Participants Attended Gartner Conferences','monthly_avg','total_interactions']].sort_values('total_interactions', ascending=False).head(10)

    # recos
    type_col = 'Account Type(Short)' if 'Account Type(Short)' in u.columns else None
    low_list = u.sort_values('total_interactions').head(10)[[c for c in [name_col, type_col, 'total_interactions'] if c]].to_dict('records')
    remove_list = u[u['total_interactions']==0].head(10)[[c for c in [name_col, type_col, 'Total Cost (3 Years)'] if c in u.columns]].to_dict('records')
    adf = u[u['total_interactions']>0].copy()
    if not adf.empty:
        adf['cost_per_interaction'] = np.where(adf['total_interactions']>0, adf['Total Cost (3 Years)']/adf['total_interactions'], np.inf)
        q25 = adf['total_interactions'].quantile(0.25)
        downgrade_list = adf[adf['total_interactions']<=q25].sort_values('cost_per_interaction', ascending=False).head(10)[[c for c in [name_col, type_col, 'total_interactions', 'cost_per_interaction'] if c]].to_dict('records')
    else:
        downgrade_list = []

    team_candidates = ['Department','Dept','Agency','Organisation','Organization','Org','Team','Division','Group','Account Type(Short)']
    team_col = next((c for c in team_candidates if c in u.columns), type_col)
    if team_col:
        grp = u.groupby(team_col, dropna=False); q25_all = u['total_interactions'].quantile(0.25); rows=[]
        for team, g in grp:
            users = int(g.shape[0]); zero = int((g['total_interactions']==0).sum()); low = int((g['total_interactions']<=q25_all).sum())
            avg_int = float(g['total_interactions'].mean()) if users else 0.0
            cost = float(g['Total Cost (3 Years)'].sum()) if 'Total Cost (3 Years)' in g.columns else 0.0
            zero_rate = zero/users if users else 0.0; low_rate = low/users if users else 0.0
            risk = 0.6*zero_rate + 0.4*low_rate
            rows.append({"Team": str(team) if team==team else "Unspecified","Users":users,"ZeroUsage":zero,"LowUtil":low,"ZeroRate":round(zero_rate,3),"LowRate":round(low_rate,3),"AvgInteractions":round(avg_int,2),"TotalCost3Y":round(cost,2),"RiskScore":round(risk,3)})
        at_risk_df = pd.DataFrame(rows).sort_values(["RiskScore","ZeroRate","LowRate"], ascending=False)
    else:
        at_risk_df = pd.DataFrame(columns=["Team","Users","ZeroUsage","LowUtil","ZeroRate","LowRate","AvgInteractions","TotalCost3Y","RiskScore"])

    return {
        "kpi": {"total_cost_3y": total_cost_3y, "spent_20m": spent_20m, "apv_total": apv_total, "pct_apv_20m": pct_apv_20m, "licensed_users": licensed_users, "cost_per_download": cost_per_download, "avg_survey": avg_survey},
        "top_users": top_users,
        "low": low_list, "remove": remove_list, "down": downgrade_list, "at_risk": at_risk_df,
        "cols": {"name": name_col, "type": type_col}
    }

def refresh(xlsx_path, html_path):
    data = compute_all(xlsx_path)
    html = Path(html_path).read_text(encoding='utf-8', errors='ignore')

    # Tabs fix
    html = re.sub(r"onclick=\"showTab\\('([^']+)'\\)\"", r"onclick=\"showTab('\\1', event)\"", html)
    html = re.sub(r"function\\s+showTab\\s*\\(\\s*tabName\\s*\\)", "function showTab(tabName, evt)", html)
    html = html.replace("event.target.classList.add('active');", "if (evt && evt.target) evt.target.classList.add('active');")

    # KPIs
    k = data["kpi"]
    kpi_block = f"""
                <div class="metric-card" style="background:#0d6efd;color:#fff">
                    <div class="metric-value">{money_millions(k['total_cost_3y'])}</div>
                    <div class="metric-label">Total Contract Cost (GovTech + SNG)</div>
                    <div class="metric-sub" style="font-size:12px;opacity:0.9">
                        20‑month spend: <strong>{money_millions(k['spent_20m'])}</strong> · {pct(k['pct_apv_20m'])} of APV {money_millions(k['apv_total'])}
                    </div>
                </div>
                <div class="metric-card" style="background:#0d6efd;color:#fff">
                    <div class="metric-value">{int(k['licensed_users'])}</div>
                    <div class="metric-label">Licensed Users</div>
                </div>
                <div class="metric-card" style="background:#0d6efd;color:#fff">
                    <div class="metric-value">{money(k['cost_per_download'])}</div>
                    <div class="metric-label">Cost per Download</div>
                </div>
                <div class="metric-card" style="background:#0d6efd;color:#fff">
                    <div class="metric-value">{float(k['avg_survey']):.2f}</div>
                    <div class="metric-label">User Satisfaction (5 scale)</div>
                </div>
    """

    ov_idx = html.lower().find('<div id="overview"')
    g4_idx = html.lower().find('<div class="grid grid-4">', ov_idx)
    if g4_idx != -1:
        rest = html[g4_idx:]
        depth=0; end_idx=None
        for m in re.finditer(r'<div|</div>', rest):
            token = m.group(0)
            if token == '<div': depth += 1
            else:
                depth -= 1
                if depth == 0: end_idx = m.end(); break
        if end_idx:
            html = html[:g4_idx] + re.sub(r'(<div class="grid grid-4">)([\\s\\S]*?)(</div>)', r'\\1\\n'+kpi_block+r'\\3', rest[:end_idx], count=1) + rest[end_idx:]
        else:
            html = re.sub(r'(<div class="grid grid-4">)[\\s\\S]*?(</div>)', r'\\1\\n'+kpi_block+r'\\2', html, count=1)

    # Top users table
    tu = data["top_users"]
    rows = []
    for _, r in tu.iterrows():
        rows.append(
            f"<tr><td>{r[data['cols']['name']]}</td>"
            f"<td>{int(r['No of Report download'])}</td>"
            f"<td>{int(r['No of Call'])}</td>"
            f"<td>{int(r['No. Participants Attended Gartner Conferences'])}</td>"
            f"<td>{r['monthly_avg']}/month</td>"
            f"<td>{int(r['total_interactions'])}</td></tr>"
        )
    table_html = (
        '<table class="table">'
        '<thead><tr><th>User</th><th>Downloads</th><th>Calls</th><th>Conferences</th><th>Monthly Avg</th><th>Total Interactions</th></tr></thead>'
        '<tbody>' + "\\n".join(rows) + '</tbody></table>'
    )
    header_pat = r'(<h3>👥 Top User Analysis \(20-month data\)</h3>[\\s\\S]*?<table[^>]*>)[\\s\\S]*?(</table>)'
    if re.search(header_pat, html):
        html = re.sub(header_pat, r'\\1' + table_html + r'\\2', html)
    else:
        insert_after = html.lower().find('</div>', ov_idx)
        if insert_after != -1:
            html = html[:insert_after] + f'\\n<h3>👥 Top User Analysis (20-month data)</h3>\\n{table_html}\\n' + html[insert_after:]

    # Insights with recos + at-risk
    low, remove, down, at_risk = data["low"], data["remove"], data["down"], data["at_risk"]
    name_col, type_col = data["cols"]["name"], data["cols"]["type"]
    def nm(r): return r.get(name_col) or next(iter(r.values()))
    def tp(r): return r.get(type_col,'—') if type_col else '—'

    rec = []
    rec.append("\\n<!-- Auto Recommendations Start -->")
    rec.append('<div class="card" style="margin-top:12px">')
    rec.append('  <div class="card-header d-flex justify-content-between align-items-center">')
    rec.append('    <strong>🔧 Recommendations</strong>')
    rec.append('    <span class="small text-muted">Generated from latest Excel</span>')
    rec.append('  </div>')
    rec.append('  <div class="card-body">')
    rec.append('    <div class="row">')
    rec.append('      <div class="col-md-6"><h5 class="mb-2">Top Low‑Utilization Accounts</h5><ol style="padding-left:18px">')
    for r in low[:10]: rec.append(f"        <li><strong>{nm(r)}</strong> ({tp(r)}) — {int(r.get('total_interactions',0))} interactions</li>")
    rec.append('      </ol></div>')
    rec.append('      <div class="col-md-6"><h5 class="mb-2">Seat Right‑Sizing</h5>')
    rec.append('        <p class="mb-1"><u>Remove Seats (no usage)</u></p><ul>')
    for r in remove[:5]: rec.append(f"          <li><strong>{nm(r)}</strong> ({tp(r)}) — cost over 3y: {money(r.get('Total Cost (3 Years)',0))}</li>")
    rec.append('        </ul><p class="mb-1"><u>Downgrade Candidates (high cost/interaction, bottom‑quartile usage)</u></p><ul>')
    for r in down[:5]:
        cpi = r.get('cost_per_interaction', None)
        try: cpi_txt = money(cpi) if cpi is not None and float(cpi)==float(cpi) else '—'
        except: cpi_txt = '—'
        rec.append(f"          <li><strong>{nm(r)}</strong> ({tp(r)}) — {int(r.get('total_interactions',0))} interactions; ~{cpi_txt} per interaction</li>")
    rec.append('        </ul></div>')
    rec.append('    </div><hr class="my-3" />')
    rec.append('    <h5 class="mb-2">🚩 At‑Risk Teams</h5><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Team</th><th>Users</th><th>Zero‑Usage</th><th>Low‑Util</th><th>Zero%</th><th>Low%</th><th>Avg Interactions</th><th>Total Cost (3y)</th><th>Risk Score</th></tr></thead><tbody>')
    for _, row in at_risk.head(8).iterrows():
        rec.append(f"      <tr><td>{row['Team']}</td><td>{int(row['Users'])}</td><td>{int(row['ZeroUsage'])}</td><td>{int(row['LowUtil'])}</td><td>{row['ZeroRate']:.0%}</td><td>{row['LowRate']:.0%}</td><td>{row['AvgInteractions']:.2f}</td><td>{money(row['TotalCost3Y'])}</td><td>{row['RiskScore']:.2f}</td></tr>")
    rec.append('</tbody></table></div>')
    rec.append('    <div class="mt-2"><strong>Download CSVs:</strong> <a href="/data/low_utilization_accounts.csv" download>Low‑Util Accounts</a> · <a href="/data/remove_seats.csv" download>Remove Seats</a> · <a href="/data/downgrade_candidates.csv" download>Downgrade Candidates</a> · <a href="/data/at_risk_teams.csv" download>At‑Risk Teams</a></div>')
    rec.append('  </div></div><!-- Auto Recommendations End -->\\n')
    rec_html = "\\n".join(rec)

    if re.search(r'(<div id="insights"[^>]*class="[^"]*tab-content[^"]*"[^>]*>)', html, flags=re.IGNORECASE):
        html = re.sub(r'(<div id="insights"[^>]*class="[^"]*tab-content[^"]*"[^>]*>)', r'\\1\\n' + rec_html, html, count=1, flags=re.IGNORECASE)
    else:
        html += "\\n" + rec_html

    Path(html_path).write_text(html, encoding='utf-8')

    # CSV exports
    out_dir = Path(html_path).parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(data["low"]).to_csv(out_dir / "low_utilization_accounts.csv", index=False)
    pd.DataFrame(data["remove"]).to_csv(out_dir / "remove_seats.csv", index=False)
    pd.DataFrame(data["down"]).to_csv(out_dir / "downgrade_candidates.csv", index=False)
    data["at_risk"].to_csv(out_dir / "at_risk_teams.csv", index=False)

def main():
    if len(sys.argv) != 3:
        print("Usage: python tools/refresh_index.py <excel> <public/INDEX.html>")
        sys.exit(1)
    refresh(sys.argv[1], sys.argv[2])
    print("OK: Dashboard refreshed: KPIs, Top Users, Recos, At‑Risk, CSV exports.")

if __name__ == "__main__":
    main()
