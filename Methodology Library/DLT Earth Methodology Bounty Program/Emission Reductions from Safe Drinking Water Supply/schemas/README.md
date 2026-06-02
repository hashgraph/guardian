# Schemas — VMR0015 v1.0 Safe Drinking Water dMRV

These are the **17 schemas** used by the policy, exported as standalone JSON for
review. They are extracted directly from `VMR0015.policy` (the importable binary),
so they are guaranteed identical to what Guardian loads on import — these copies
are for reading/diffing only; importing `VMR0015.policy` brings them in
automatically.

Each filename is `<SchemaName>__<short-iri>.json`.

## Index

| Schema | IRI (prefix) | Role in the policy |
|---|---|---|
| Baseline Emissions | `#f1a41485` | Baseline emissions detail |
| Device Installation Record | `#e9d241e4` | Per-device installation data |
| ER Summary | `#0f67a367` | Aggregated ER summary |
| Geographic Location | `#c11d5c65` | Location data |
| Household Survey | `#861b4f98` | Usage/adoption survey |
| Issuance Request | `#5e4e2acc` | Credit issuance request |
| Leakage Estimate | `#33b17c2e` | Leakage detail |
| Maintenance Log | `#b637e78d` | Device maintenance records |
| Monitoring Period | `#8c4039cb` | Defines a monitoring period |
| **Monitoring Report** | `#db884e2d` | **Carries the AMS-III.AV. parameters — the calculation input** |
| PP Profile | `#985ba731` | Project Proponent profile |
| Policy Registry Index | `#c327b0d0` | Registry index document |
| Project Description | `#eecf80c9` | Project registration document |
| Project Emissions | `#aee84784` | Project emissions detail |
| VVB Profile | `#7bcb1519` | Validation/Verification Body profile |
| VVB Verification Report | `#5f5a4078` | VVB verification document |
| Water Quality Test | `#10402938` | Water-quality sampling |

## Key fields — Monitoring Report

The calculation block (`calculate_report_fields`) and the formula linked
definitions both operate on these. **BE (`field3`) and ER (`field6`) are computed
on submission** from the AMS-III.AV. parameters below; they are not entered.

| Field | Meaning |
|---|---|
| `field12` | `QPW_y` — safe water supplied (L/yr) |
| `field13` | `m` — fraction of functional appliances meeting SDW (0–1) |
| `field14` | `X_boil` — fraction whose baseline is boiling (0–1) |
| `field15` | `nwb` — baseline appliance efficiency (0–1) |
| `field16` | `EF_fuel` — fuel emission factor (tCO₂/TJ) |
| `field17` | `f_i` — fraction of non-renewable biomass / fNRB (0–1) |
| `field18` | `BL_fuel` — baseline fuel fraction (0–1) |
| `field10` / `field11` | Appliances passing WQ / total (water-quality gate) |
| `field4` | PE Total (tCO₂e) — entered |
| `field5` | LE Total (tCO₂e) — entered |
| `field3` | BE Total (tCO₂e) — **computed** (Eq. 1/5) |
| `field6` | ER Total (tCO₂e) — **computed** (Eq. 7); MintToken rule |

> Note: the ER Summary schema retains an unused `uncertaintyDiscount` field
> labelled "Fixed 0.89". It is **dormant** — the calculation block does not read
> it (the ×0.89 discount was removed; see CHANGELOG 2.1.0). The standalone schema
> files are kept byte-identical to the binary, so the legacy label remains visible
> here for transparency.
