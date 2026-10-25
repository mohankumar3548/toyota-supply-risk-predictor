"""Supplier risk scoring and early warnings for Toyota."""
import json
from pathlib import Path

import numpy as np
import pandas as pd

from src.utils import bar, holt, kpi, line, num, pct, rec, table

META = json.loads(Path(__file__).with_name("meta.json").read_text())
PARAMS = [
    {"name": "alert_threshold", "label": "Alert threshold (0-100)", "min": 40, "max": 80, "step": 5, "default": 60},
    {"name": "safety_stock_days", "label": "Current safety stock (days)", "min": 2, "max": 20, "step": 1, "default": 5},
]
LEXICON = {"drought": 18, "sold out": 14, "fire": 30, "halts": 25, "strike": 22, "congestion": 15, "delays": 10, "shortage": 20, "flood": 25,
           "sanctions": 25, "award": -5, "expands": -8, "beat": -4}


def news_score(text):
    t = text.lower()
    return sum(v for w, v in LEXICON.items() if w in t)


def run(data, alert_threshold=60, safety_stock_days=5):
    sup, dl, parts, news = data["suppliers"], data["deliveries"], data["parts"].copy(), data["news"].copy()
    news["risk_points"] = news.headline.map(news_score)
    parts["supplier_list"] = parts.suppliers.str.split("|"); parts["line_list"] = parts.lines.str.split("|")
    rows = []
    for s in sup.itertuples():
        L = dl[dl.supplier_id == s.supplier_id].sort_values("week")
        lt, ot = L.lead_time_days.to_numpy(), L.on_time.to_numpy()
        base, sd = lt[:40].mean(), lt[:40].std() or 0.5
        recent = lt[-4:].mean(); z = (recent - base) / sd
        fc = holt(lt, 0.5, 0.3, 4)[1][-1]
        otr = ot[-12:].mean(); cv = lt[-12:].std() / lt[-12:].mean()
        ns = float(np.clip(news[news.supplier_id == s.supplier_id].risk_points.sum(), 0, 40))
        mine = parts[parts.supplier_list.apply(lambda x: s.supplier_id in x)]
        single = mine[mine.supplier_list.str.len() == 1]
        lines = sorted({l for x in mine.line_list for l in x})
        net = min(40, len(single) * 12 + len(lines) * 4)
        score = int(np.clip(round(22 * np.clip(z / 4, 0, 1) + 22 * (1 - otr) / 0.5 + 16 * np.clip(cv / 0.3, 0, 1) + 0.6 * ns + 0.5 * net + s.defect_rate * 500), 0, 100))
        delay = fc - base
        action = ("Qualify a backup supplier now and air-freight the gap" if len(single) and delay > safety_stock_days else
                  f"Raise safety stock to {int(np.ceil(delay + 2))} days" if delay > safety_stock_days else
                  "Visit supplier and confirm recovery plan" if ns > 15 else "Expedite next two shipments" if z > 2 else "Monitor weekly")
        urgency = "Critical" if score >= alert_threshold + 15 else "High" if score >= alert_threshold else "Watch"
        rows.append({"supplier": s.supplier, "supplier_id": s.supplier_id, "region": s.region, "risk_score": score, "lead_time_baseline": round(base, 1),
                     "lead_time_recent": round(recent, 1), "forecast_4wk": round(fc, 1), "drift_z": round(z, 1), "on_time_12wk": round(otr, 2),
                     "news_points": ns, "parts": ", ".join(mine.part + np.where(mine.supplier_list.str.len() == 1, " (single)", "")) or "None",
                     "lines": ", ".join(lines), "urgency": urgency, "action": action, "_delay": delay, "_single": len(single)})
    R = pd.DataFrame(rows).sort_values("risk_score", ascending=False)
    alerts = R[R.risk_score >= alert_threshold]
    def part_short(p):
        rs = R.set_index("supplier_id").loc[p.supplier_list]
        return len(p.supplier_list) == 1 and rs._delay.max() > safety_stock_days, max(0.0, rs._delay.max() - safety_stock_days)
    sh = parts.apply(lambda p: pd.Series(part_short(p), index=["short", "days_short"]), axis=1)
    vehicles = float((parts.daily_usage * sh.days_short * sh.short).sum() / 1.5)
    exp = []
    for ln in ["Line 1", "Line 2", "Line 3", "Line 4"]:
        tot = 0
        for p in parts.itertuples():
            if ln in p.line_list:
                s_ = R.set_index("supplier_id").loc[p.supplier_list].risk_score
                tot += (s_.iloc[0] * 1.5) if len(p.supplier_list) == 1 else s_.min() * 0.6
        exp.append({"line": ln, "exposure": round(tot / 10, 1)})
    exp = pd.DataFrame(exp).sort_values("exposure", ascending=False)
    top = R.iloc[0]
    ltd = dl[dl.supplier_id == top.supplier_id].sort_values("week").lead_time_days.to_numpy()
    lt_chart = pd.DataFrame({"week": [f"W{w + 1}" for w in range(52)] + [f"F+{i + 1}" for i in range(4)],
                             "actual": list(ltd) + [None] * 4, "forecast": [None] * 51 + [ltd[-1]] + list(holt(ltd, 0.5, 0.3, 4)[1])})
    single_parts = parts[parts.supplier_list.str.len() == 1]
    show = R.drop(columns=["_delay", "_single", "supplier_id"])
    return {
        "steps": [f"{len(sup)} suppliers, {len(parts)} parts, 52 weeks of deliveries", f"Average on-time (12 wks) {pct(R.on_time_12wk.mean(), 0)}",
                  f"Biggest forecast rise: {R.sort_values('_delay').iloc[-1].supplier} +{R._delay.max():.1f} days", f"{int((R.drift_z > 2).sum())} suppliers drifting (z > 2)",
                  f"{int((news.risk_points > 0).sum())} risk headlines found", f"{len(single_parts)} single-source parts", f"{len(alerts)} suppliers above {alert_threshold}", f"{len(alerts)} mitigation actions"],
        "kpis": [kpi("Suppliers on alert", str(len(alerts)), f"Score >= {alert_threshold}"), kpi("Top risk", top.supplier, f"{top.risk_score}/100, {top.parts}"),
                 kpi("Single-source parts", str(len(single_parts)), f"of {len(parts)} parts"), kpi("Vehicles at risk", num(vehicles), f"Parts short beyond {safety_stock_days} days of safety stock")],
        "charts": [bar("Supplier risk ranking (top 10)", R.head(10)[["supplier", "risk_score"]], "supplier", "risk_score"),
                   line(f"Lead time: {top.supplier}", lt_chart, "week", ["actual", "forecast"], "52 weeks of actual lead time and the 4-week Holt forecast."),
                   bar("Assembly line exposure", exp, "line", "exposure")],
        "tables": [table("Mitigation plan", show.head(12)), table("News signals", news.merge(sup[["supplier_id", "supplier"]], on="supplier_id")[["supplier", "headline", "risk_points"]])],
        "recs": [rec(f"{r.supplier}: {r.action}", f"{r.parts} feeding {r.lines}. Lead time forecast {r.forecast_4wk} days vs normal {r.lead_time_baseline}.", r.urgency) for r in alerts.head(4).itertuples()]
                + [rec(f"Dual-source single-source parts on {exp.iloc[0].line} and {exp.iloc[1].line}", f"{len(single_parts)} parts depend on one supplier, starting with {', '.join(single_parts.part.head(3))}.", "Structural")],
    }


if __name__ == "__main__":
    from src.data_generator import load_or_generate
    from src.report import write_reports

    out = run(load_or_generate(), **{p["name"]: p["default"] for p in PARAMS})
    for k in out["kpis"]:
        print(f"{k['label']}: {k['value']}  {k['note']}")
    print("Reports written to", write_reports(out, META, Path(__file__).resolve().parent.parent / "reports"))
