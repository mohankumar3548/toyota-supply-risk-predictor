"""Sample data for Toyota: 30 tier-1 suppliers, 18 parts, 52 weeks of deliveries and a supplier news feed."""
from pathlib import Path

import numpy as np
import pandas as pd

REGIONS = ["Japan", "Thailand", "China", "Taiwan", "Mexico", "USA", "Malaysia", "India"]
PARTS = ["Semiconductors", "Wire harness", "Seats", "Brake systems", "Glass", "Steel coil", "Batteries", "Tyres", "Airbags", "Infotainment",
         "Castings", "Plastics", "Paint", "Sensors", "Bearings", "Electronics ECU", "Lighting", "Exhaust"]
NEWS = [(3, "Drought cuts water supply to Taiwan chip fabs, output may slow"), (3, "Foundry capacity sold out through next year amid AI demand"),
        (19, "Factory fire halts battery cell line in Malaysia plant"), (11, "Union announces strike vote at harness maker"),
        (24, "Port congestion delays container departures by a week"), (7, "Supplier wins sustainability award"),
        (15, "Opens new plant, expands capacity 20%"), (2, "Quarterly results beat expectations")]


def generate(seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    a, b = ["Aki", "Nordic", "Siam", "Pacific", "Delta", "Kanto", "Lumen", "Orion", "Hoshi", "Tera"], ["Components", "Industries", "Tech", "Precision", "Works", "Systems"]
    sup = pd.DataFrame({"supplier_id": [f"S{101 + i}" for i in range(30)], "supplier": [f"{a[i % 10]} {b[i % 6]}" for i in range(30)],
                        "region": rng.choice(REGIONS, 30), "base_lead_days": rng.uniform(5, 30, 30).round(1), "lead_sd": rng.uniform(0.4, 1.8, 30).round(2),
                        "defect_rate": rng.uniform(0.002, 0.012, 30).round(4)})
    drift = np.zeros(30); drift[[3, 11, 19, 24]] = [0.35, 0.22, 0.5, 0.15]
    sup.loc[3, "region"], sup.loc[19, "region"], sup.loc[11, "defect_rate"] = "Taiwan", "Malaysia", 0.03
    deliveries = []
    for i, s in sup.iterrows():
        for w in range(52):
            lt = max(1, s.base_lead_days + (drift[i] * (w - 40) * s.base_lead_days / 10 if w > 40 else 0) + rng.normal(0, s.lead_sd))
            deliveries.append({"supplier_id": s.supplier_id, "week": w + 1, "lead_time_days": round(lt, 2), "on_time": int(lt <= s.base_lead_days + 1.5 * s.lead_sd)})
    parts = []
    for j, p in enumerate(PARTS):
        ids = [sup.supplier_id[(j * 7) % 30]] + ([sup.supplier_id[(j * 11 + 5) % 30]] if rng.random() >= 0.4 else [])
        if j == 0: ids = [sup.supplier_id[3]]
        if j == 6: ids = [sup.supplier_id[19]]
        lines = [f"Line {k + 1}" for k in range(4) if rng.random() < 0.6] or ["Line 1"]
        parts.append({"part_id": f"PT{j + 1}", "part": p, "suppliers": "|".join(ids), "lines": "|".join(lines), "daily_usage": int(rng.integers(800, 2401))})
    news = pd.DataFrame([{"supplier_id": sup.supplier_id[i], "headline": t} for i, t in NEWS])
    return {"suppliers": sup.drop(columns=["base_lead_days", "lead_sd"]), "deliveries": pd.DataFrame(deliveries), "parts": pd.DataFrame(parts), "news": news}


# ---------------------------------------------------------------------------
# Save and load helpers
# ---------------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def save(data: dict, folder: Path = DATA_DIR) -> None:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    for name, df in data.items():
        df.to_csv(folder / f"{name}.csv", index=False)


def load_or_generate(folder: Path = DATA_DIR, seed: int = 42) -> dict:
    """Read the CSVs in data/ if they exist, otherwise generate fresh sample data."""
    folder = Path(folder)
    names = list(generate(seed).keys())
    if all((folder / f"{n}.csv").exists() for n in names):
        return {n: pd.read_csv(folder / f"{n}.csv") for n in names}
    return generate(seed)


if __name__ == "__main__":
    d = generate(42)
    save(d)
    for n, df in d.items():
        print(f"data/{n}.csv  {len(df):,} rows x {df.shape[1]} columns")
