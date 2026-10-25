/* Toyota Supplier Early Warning: sample data generator and algorithm for Toyota Motor Corporation. */
const TOOL = {
  num: 8, area: "Operations", product: "Supply Chain Disruption Prediction", seed: 88,
  title: "Toyota Supplier Early Warning", company: "Toyota Motor Corporation",
  why: "During the 2021 chip shortage Toyota had to cut production, which showed how late warnings hurt even a lean, well-run supply chain. This tool scores every supplier and part each week and flags trouble before lines stop.",
  statement: "A manufacturing company frequently experiences production delays because disruptions in suppliers, inventory and transportation are identified too late. Develop an AI operations system that analyzes supplier, inventory, production and delivery data to identify emerging risks and recommend mitigation actions.",
  dataNote: "30 tier-1 suppliers, 18 parts, 4 assembly lines, 52 weeks of deliveries plus a news feed (sample data).",
  steps: [
    ["Collect supply data", "Deliveries, lead times, defects, inventory, production plan, news"],
    ["Supplier reliability", "On-time rate, lead-time variability, defect rate"],
    ["Forecast lead times", "Holt trend model per supplier, 4 weeks ahead"],
    ["Early anomaly detection", "Recent weeks vs the supplier's own baseline (z-score)"],
    ["News risk scan", "Keyword risk scoring of supplier headlines"],
    ["Network impact", "Trace supplier → part → assembly line, flag single-source parts"],
    ["Composite risk score", "Weighted score per supplier and part"],
    ["Mitigation plan", "Backup supplier, safety stock or expedite, ranked by urgency"]
  ],
  params: [
    { id: "alert", label: "Alert threshold", min: 40, max: 80, step: 5, value: 60, fmt: v => v + " / 100" },
    { id: "ss", label: "Current safety stock", min: 2, max: 20, step: 1, value: 5, fmt: v => v + " days" }
  ],
  questions: ["Which supplier is most likely to stop a line?", "Why is the semiconductor supplier flagged?", "Should we raise safety stock or dual-source?", "Which assembly line is most exposed?"],
  generate(r) {
    const regions = ["Japan", "Thailand", "China", "Taiwan", "Mexico", "USA", "Malaysia", "India"];
    const cats = ["Semiconductors", "Wire harness", "Seats", "Brake systems", "Glass", "Steel coil", "Batteries", "Tyres", "Airbags", "Infotainment", "Castings", "Plastics", "Paint", "Sensors", "Bearings", "Electronics ECU", "Lighting", "Exhaust"];
    const sup = S.range(30).map(i => ({ id: "S" + (101 + i), name: `${["Aki", "Nordic", "Siam", "Pacific", "Delta", "Kanto", "Lumen", "Orion", "Hoshi", "Tera"][i % 10]} ${["Components", "Industries", "Tech", "Precision", "Works", "Systems"][i % 6]}`, region: r.pick(regions), base: r.u(5, 30), sd: r.u(0.4, 1.8), drift: 0, defect: r.u(0.002, 0.012) }));
    [3, 11, 19, 24].forEach((i, k) => { sup[i].drift = [0.35, 0.22, 0.5, 0.15][k]; });
    sup[3].region = "Taiwan"; sup[19].region = "Malaysia"; sup[11].defect = 0.03;
    const parts = cats.map((c, j) => { const n = r.chance(0.4) ? 1 : 2; const ss = [sup[(j * 7) % 30].id]; if (n > 1) ss.push(sup[(j * 11 + 5) % 30].id); if (j === 0) ss.splice(0, ss.length, sup[3].id); if (j === 6) ss.splice(0, ss.length, sup[19].id); return { id: "PT" + (j + 1), name: c, sup: ss, lines: S.range(4).filter(() => r.chance(0.6)).map(l => "Line " + (l + 1)), daily: r.int(800, 2400), invDays: r.u(3, 14) }; });
    parts.forEach(p => { if (!p.lines.length) p.lines = ["Line 1"]; });
    const lt = sup.map(s => S.range(52).map(w => Math.max(1, s.base + (w > 40 ? s.drift * (w - 40) * s.base / 10 : 0) + r.n(0, s.sd)) ));
    const ontime = sup.map((s, i) => lt[i].map((v, w) => v <= s.base + 1.5 * s.sd ? 1 : 0));
    const news = [
      { s: 3, t: "Drought cuts water supply to Taiwan chip fabs, output may slow" },
      { s: 3, t: "Foundry capacity sold out through next year amid AI demand" },
      { s: 19, t: "Factory fire halts battery cell line in Malaysia plant" },
      { s: 11, t: "Union announces strike vote at harness maker" },
      { s: 24, t: "Port congestion delays container departures by a week" },
      { s: 7, t: "Supplier wins sustainability award" },
      { s: 15, t: "Opens new plant, expands capacity 20%" },
      { s: 2, t: "Quarterly results beat expectations" }
    ];
    return { sup, parts, lt, ontime, news };
  },
  analyze(D, P, r) {
    const { sup, parts, lt, ontime, news } = D;
    const lex = { drought: 18, "sold out": 14, fire: 30, halts: 25, strike: 22, congestion: 15, delays: 10, shortage: 20, flood: 25, sanctions: 25, award: -5, expands: -8, beat: -4 };
    const rows = sup.map((s, i) => {
      const L = lt[i], base = L.slice(0, 40), mu = S.mean(base), sd = S.sd(base) || 0.5, recent = S.mean(L.slice(-4));
      const z = (recent - mu) / sd, h = M.holt(L, 0.5, 0.3, 4), fc4 = h.fc[3];
      const otr = S.mean(ontime[i].slice(-12)), cv = S.sd(L.slice(-12)) / S.mean(L.slice(-12));
      const ns = news.filter(n => n.s === i).map(n => S.sum(Object.entries(lex).filter(([w]) => n.t.toLowerCase().includes(w)).map(([, v]) => v)));
      const nscore = S.clamp(S.sum(ns), 0, 40);
      const myParts = parts.filter(p => p.sup.includes(s.id)), single = myParts.filter(p => p.sup.length === 1), lines = new Set(myParts.flatMap(p => p.lines));
      const net = S.clamp(single.length * 12 + lines.size * 4, 0, 40);
      const score = S.clamp(Math.round(22 * S.clamp(z / 4, 0, 1) + 22 * (1 - otr) / 0.5 + 16 * S.clamp(cv / 0.3, 0, 1) + 0.6 * nscore + 0.5 * net + s.defect * 500), 0, 100);
      return { i, s, mu, recent, z, fc4, otr, cv, nscore, net, single, lines: [...lines], parts: myParts, score, delay: fc4 - mu, headline: news.find(n => n.s === i)?.t };
    }).sort((a, b) => b.score - a.score);
    const alerts = rows.filter(x => x.score >= P.alert);
    const partRisk = parts.map(p => { const rs = p.sup.map(id => rows.find(x => x.s.id === id)); const best = Math.min(...rs.map(x => x.score)); const worstDelay = Math.max(...rs.map(x => Math.max(0, x.delay))); const cover = P.ss + p.invDays * 0; const short = p.sup.length === 1 && worstDelay > cover; return { p, score: p.sup.length === 1 ? rs[0].score : Math.round(best * 0.6), delay: worstDelay, single: p.sup.length === 1, short }; }).sort((a, b) => b.score - a.score);
    const lineExp = ["Line 1", "Line 2", "Line 3", "Line 4"].map(l => ({ label: l, value: S.sum(partRisk.filter(pr => pr.p.lines.includes(l)).map(pr => pr.score * (pr.single ? 1.5 : 1))) / 10 })).sort((a, b) => b.value - a.value);
    const action = x => x.single.length && x.delay > P.ss ? "Qualify a backup supplier now and air-freight the gap" : x.delay > P.ss ? `Raise safety stock to ${Math.ceil(x.delay + 2)} days` : x.nscore > 15 ? "Visit supplier, confirm recovery plan" : x.z > 2 ? "Expedite next two shipments" : "Monitor weekly";
    const urg = x => x.score >= P.alert + 15 ? "Critical" : x.score >= P.alert ? "High" : "Watch";
    const top = rows[0];
    const unitsAtRisk = S.sum(partRisk.filter(pr => pr.short).map(pr => pr.p.daily * Math.max(0, pr.delay - P.ss)));
    return {
      steps: [`${sup.length} suppliers, ${parts.length} parts, 52 weeks of deliveries`, `Avg on-time (last 12 wks) ${F.pct(S.mean(rows.map(x => x.otr)), 0)}`, `Biggest forecast rise: ${[...rows].sort((a, b) => b.delay - a.delay)[0].s.name} +${[...rows].sort((a, b) => b.delay - a.delay)[0].delay.toFixed(1)} days`, `${rows.filter(x => x.z > 2).length} suppliers drifting (z > 2)`, `${news.filter(n => S.sum(Object.entries(lex).filter(([w]) => n.t.toLowerCase().includes(w)).map(([, v]) => v)) > 0).length} risk headlines found`, `${partRisk.filter(p => p.single).length} single-source parts`, `${alerts.length} suppliers above ${P.alert}`, `${alerts.length} mitigation actions`],
      kpis: [
        { label: "Suppliers on alert", value: String(alerts.length), note: `Score ≥ ${P.alert}`, tone: alerts.length ? "bad" : "good" },
        { label: "Top risk", value: top.s.name, note: `${top.score}/100 · ${top.parts.map(p => p.name).join(", ")}`, tone: "bad" },
        { label: "Single-source parts", value: String(partRisk.filter(p => p.single).length), note: `of ${parts.length} parts`, tone: "warn" },
        { label: "Vehicles at risk", value: F.num(unitsAtRisk / 1.5), note: `Parts short beyond ${P.ss} days of safety stock`, tone: unitsAtRisk ? "bad" : "good" }
      ],
      sections: [
        { pair: [
          { title: "Supplier risk ranking", note: "Composite of lead-time drift, on-time rate, variability, news, network position and defects.", chart: C.bar(rows.slice(0, 10).map(x => ({ label: x.s.name, value: x.score, tone: x.score >= P.alert ? "bad" : x.score >= P.alert - 15 ? "warn" : "" })), { fmt: v => F.num(v), ref: P.alert, max: 100, labelW: 150 }) },
          { title: `Lead time: ${top.s.name}`, note: "52 weeks of actual lead time, then the 4-week forecast (dashed). Red line is the normal level plus safety stock.", chart: (() => { const L = lt[top.i]; const h = M.holt(L, 0.5, 0.3, 4); const xl = S.range(56).map(i => i < 52 ? "W" + (i + 1) : "F+" + (i - 51)); return C.line(xl, [{ values: L.concat([null, null, null, null]), tone: "c1" }, { values: new Array(51).fill(null).concat([L[51]], h.fc), tone: "c3", dash: "4 3" }, { values: new Array(56).fill(null), ref: top.mu + P.ss }], { fmt: v => v.toFixed(0) + "d", every: 8 }); })() }
        ] },
        { pair: [
          { title: "Line exposure", note: "Sum of risk on the parts each assembly line uses; single-source parts count 1.5x.", chart: C.bar(lineExp.map(l => ({ label: l.label, value: l.value, tone: "c3" })), { fmt: v => v.toFixed(0), labelW: 80 }) },
          { title: "News signals", html: T.table(["Supplier", "Headline", "Risk"], news.map(n => { const v = S.sum(Object.entries(lex).filter(([w]) => n.t.toLowerCase().includes(w)).map(([, x]) => x)); return [sup[n.s].name, n.t, T.pill(v > 0 ? "+" + v : String(v), v >= 20 ? "bad" : v > 0 ? "warn" : "good")]; }), { right: [2] }) }
        ] },
        { title: "Mitigation plan", html: T.table(["Supplier", "Region", "Parts", "Score", "Lead time now → in 4 wks", "On-time", "Urgency", "Action"], rows.slice(0, 10).map(x => [x.s.name, x.s.region, x.parts.map(p => p.name + (p.sup.length === 1 ? " (single)" : "")).join(", ") || "None", x.score, `${x.recent.toFixed(1)} → ${x.fc4.toFixed(1)} d`, F.pct(x.otr, 0), T.pill(urg(x), urg(x) === "Critical" ? "bad" : urg(x) === "High" ? "warn" : "mut"), action(x)]), { right: [3, 5] }) }
      ],
      recs: alerts.slice(0, 4).map(x => ({ title: `${x.s.name}: ${action(x)}`, body: `${x.parts.map(p => p.name).join(", ") || "Secondary parts"} feeding ${x.lines.join(", ")}. Lead time is forecast at ${x.fc4.toFixed(1)} days vs a normal ${x.mu.toFixed(1)}${x.headline ? `. News: "${x.headline}"` : ""}.`, impact: urg(x), tone: urg(x) === "Critical" ? "bad" : "warn" })).concat([{ title: `Dual-source the single-source parts on ${lineExp[0].label} and ${lineExp[1].label} this year`, body: `${partRisk.filter(p => p.single).length} parts depend on one supplier. Start with ${partRisk.filter(p => p.single).slice(0, 3).map(p => p.p.name).join(", ")}.`, impact: "Structural", tone: "" }]),
      context: { alert_threshold: P.alert, safety_stock_days: P.ss, suppliers: rows.slice(0, 12).map(x => ({ supplier: x.s.name, region: x.s.region, score: x.score, lead_time_baseline: +x.mu.toFixed(1), lead_time_recent: +x.recent.toFixed(1), forecast_4wk: +x.fc4.toFixed(1), drift_z: +x.z.toFixed(1), on_time_12wk: +x.otr.toFixed(2), news: x.headline || null, parts: x.parts.map(p => p.name + (p.sup.length === 1 ? " (single source)" : "")), lines: x.lines, action: action(x) })), line_exposure: lineExp, vehicles_at_risk: Math.round(unitsAtRisk / 1.5) }
    };
  }
};
