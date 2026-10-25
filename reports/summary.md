# Toyota Supplier Early Warning: results

Built for Toyota Motor Corporation. Prepared by K Mohan Kumar.

## Key figures

- **Suppliers on alert:** 4 (Score >= 60)
- **Top risk:** Pacific Precision (100/100, Semiconductors (single), Airbags, Infotainment (single))
- **Single-source parts:** 7 (of 18 parts)
- **Vehicles at risk:** 27,550 (Parts short beyond 5 days of safety stock)

## Algorithm, as it ran

1. **Collect supply data**: 30 suppliers, 18 parts, 52 weeks of deliveries
2. **Supplier reliability**: Average on-time (12 wks) 87%
3. **Forecast lead times**: Biggest forecast rise: Pacific Precision +17.0 days
4. **Early anomaly detection**: 4 suppliers drifting (z > 2)
5. **News risk scan**: 5 risk headlines found
6. **Network impact**: 7 single-source parts
7. **Composite risk score**: 4 suppliers above 60
8. **Mitigation plan**: 4 mitigation actions

## Recommended actions

1. **Pacific Precision: Qualify a backup supplier now and air-freight the gap.** Semiconductors (single), Airbags, Infotainment (single) feeding Line 1, Line 2, Line 3. Lead time forecast 42.7 days vs normal 25.6. *Impact: Critical*
2. **Tera Industries: Qualify a backup supplier now and air-freight the gap.** Batteries (single), Tyres feeding Line 1, Line 3, Line 4. Lead time forecast 25.0 days vs normal 16.9. *Impact: Critical*
3. **Nordic Systems: Raise safety stock to 9 days.** None feeding . Lead time forecast 23.6 days vs normal 16.7. *Impact: High*
4. **Delta Components: Visit supplier and confirm recovery plan.** Paint feeding Line 1. Lead time forecast 26.2 days vs normal 21.7. *Impact: High*
5. **Dual-source single-source parts on Line 3 and Line 2.** 7 parts depend on one supplier, starting with Semiconductors, Brake systems, Glass. *Impact: Structural*

_Generated from sample data. Figures are illustrative._
