# Toyota Supplier Early Warning

AI solution 08 of 14 · Operations · built for **Toyota Motor Corporation**

Prepared by **K Mohan Kumar**.

**Live website:** https://mohankumar3548.github.io/toyota-supply-risk-predictor/

## Problem statement

A manufacturing company frequently experiences production delays because disruptions in suppliers, inventory and transportation are identified too late. Develop an AI operations system that analyzes supplier, inventory, production and delivery data to identify emerging risks and recommend mitigation actions.

## Why Toyota Motor Corporation

During the 2021 chip shortage Toyota had to cut production, which showed how late warnings hurt even a lean, well-run supply chain. This tool scores every supplier and part each week and flags trouble before lines stop.

## Project structure

```
toyota-supply-risk-predictor/
├── index.html                 Website entry point (served by GitHub Pages)
├── frontend/
│   ├── css/style.css          Layout, typography, light and dark themes
│   └── js/
│       ├── engine.js          Maths, models, charts, page layout and AI analyst panel
│       └── model.js           Sample data and the algorithm for this problem (browser version)
├── app.py                     Streamlit dashboard (Python version of the website)
├── src/
│   ├── data_generator.py      Builds the sample dataset and saves it to data/
│   ├── model.py               The algorithm in Python (pandas, NumPy, scikit-learn)
│   ├── report.py              Writes results to reports/
│   ├── utils.py               Formatting and forecasting helpers
│   └── meta.json              Problem statement, company and algorithm steps
├── data/                      Sample data as CSV
├── reports/                   Results: results.json, summary.md and CSV tables
├── tests/test_model.py        pytest tests for the data and the model
├── requirements.txt
└── pytest.ini
```

## Algorithm

1. **Collect supply data**: Deliveries, lead times, defects, inventory, production plan, news
2. **Supplier reliability**: On-time rate, lead-time variability, defect rate
3. **Forecast lead times**: Holt trend model per supplier, 4 weeks ahead
4. **Early anomaly detection**: Recent weeks vs the supplier's own baseline (z-score)
5. **News risk scan**: Keyword risk scoring of supplier headlines
6. **Network impact**: Trace supplier → part → assembly line, flag single-source parts
7. **Composite risk score**: Weighted score per supplier and part
8. **Mitigation plan**: Backup supplier, safety stock or expedite, ranked by urgency

The same algorithm is implemented twice: in JavaScript (`frontend/js/model.js`) so the website runs in any browser with no server, and in Python (`src/model.py`) for analysis, the Streamlit dashboard and the tests.

## How to run

**Website:** open the live link above, or open `index.html` in a browser.

**Python:**

```bash
pip install -r requirements.txt
python -m src.data_generator     # create the sample data in data/
python -m src.model              # run the algorithm and write reports/
streamlit run app.py             # open the interactive dashboard
pytest                           # run the tests
```

## Data

30 tier-1 suppliers, 18 parts, 4 assembly lines, 52 weeks of deliveries plus a news feed (sample data). Files: `data/deliveries.csv`, `data/news.csv`, `data/parts.csv`, `data/suppliers.csv`. All figures are illustrative and are not Toyota Motor Corporation's actual numbers.

## Results (default settings, Python run)

| Measure | Value | Note |
|---|---|---|
| Suppliers on alert | 4 | Score >= 60 |
| Top risk | Pacific Precision | 100/100, Semiconductors (single), Airbags, Infotainment (single) |
| Single-source parts | 7 | of 18 parts |
| Vehicles at risk | 27,550 | Parts short beyond 5 days of safety stock |

### Recommended actions

1. **Pacific Precision: Qualify a backup supplier now and air-freight the gap.** Semiconductors (single), Airbags, Infotainment (single) feeding Line 1, Line 2, Line 3. Lead time forecast 42.7 days vs normal 25.6.
2. **Tera Industries: Qualify a backup supplier now and air-freight the gap.** Batteries (single), Tyres feeding Line 1, Line 3, Line 4. Lead time forecast 25.0 days vs normal 16.9.
3. **Nordic Systems: Raise safety stock to 9 days.** None feeding . Lead time forecast 23.6 days vs normal 16.7.
4. **Delta Components: Visit supplier and confirm recovery plan.** Paint feeding Line 1. Lead time forecast 26.2 days vs normal 21.7.
5. **Dual-source single-source parts on Line 3 and Line 2.** 7 parts depend on one supplier, starting with Semiconductors, Brake systems, Glass.

Full output: [`reports/summary.md`](reports/summary.md) and [`reports/results.json`](reports/results.json).

## AI analyst panel

The website includes an "Ask the AI analyst" panel that answers questions about the results through Claude. It works when the page is opened as a Claude artifact on claude.ai. On GitHub Pages the models, charts and controls run in full and the panel shows that it is unavailable.
