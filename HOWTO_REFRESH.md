# Refresh dashboard content from Excel

Run this from repo root whenever the Excel updates:
```bash
python tools/refresh_index.py path/to/Soha-Usage-Price-updated.xlsx public/INDEX.html
```
This recomputes:
- **Overview KPIs** (blue tiles): Total Contract Cost, Total Spent (20 months) with % of APV, Licensed Users, Cost per Download, Avg Survey (Q1)
- **Top User Analysis (20-month)** including **Conferences** column
- **Insight Engine** recommendations and **🚩 At‑Risk Teams**
- Exports CSVs into `public/data/`
