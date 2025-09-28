# Refresh the Dashboard & Insights from Excel

When your Excel changes, run:
```bash
python3 tools/refresh_index.py path/to/Soha-Usage-Price-updated.xlsx public/INDEX.html
```
Then commit and push to `main` so Vercel redeploys.

What gets updated:
- Licensed Users, Active Utilization Rate, Cost per Download
- Total 3-Year Spend, Document Downloads, Analyst Calls, Conference Sessions
- Insights: average usefulness score and sample size, ROI
- Tab-click behavior is also normalized if needed
