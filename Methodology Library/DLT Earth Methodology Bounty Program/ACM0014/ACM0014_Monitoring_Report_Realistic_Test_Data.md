# ACM0014 Monitoring Report — Realistic Test Input Set
**Based on: Chok Chai Starch Co. Wastewater Treatment Project (Uthai Thani, Thailand)**
CDM Project Design Document, ACM0014 v2.1, DOE-verified by JQA. UASB anaerobic digester, active volume 4,650 m³, HRT 1.87 days, ~90% COD removal, biogas to hot-oil burners + 450 kW generator + flare.

This replaces every placeholder `1` in the dry-run form with a value that is either **taken directly from the real, DOE-audited PDD** (marked ✅), or a **realistic industry-typical estimate** used to fill a gap the PDD didn't disclose at the granularity this engine needs (marked ~). Every value is labeled so you know which is which — nothing here is invented without a stated basis.

---

## 1. Fixed parameters

| Field | Description | Value | Source |
|---|---|---|---|
| `Bo` | Max methane producing capacity | **0.21** tCH₄/tCOD | ✅ Methodology's own stated IPCC conservative default |
| GWP methane | AR5, 100-yr | **28** | ✅ Per field instruction |
| GWP N₂O (field80) | AR5, 100-yr | **265** | ✅ Per field instruction |
| `D` | Baseline lagoon/pit depth | **3.0** m | ~ Typical industrial anaerobic lagoon depth (drives `fd`) |
| Discount factor | 1 = one-year data, 0.89 = 10-day campaign | **1** | ✅ Real project used full annual monitoring |
| `cin` | Baseline COD into lagoon (reference period) | **20** kgCOD/m³ | ~ Typical raw cassava/starch wastewater COD |
| `cout` | Baseline effluent COD (reference period) | **3** kgCOD/m³ | ~ Typical post-lagoon effluent, ~85% baseline removal |

`adj = 1 − cout/cin = 0.85`

---

## 2. Monthly digester data (12 months)

Digester flow derived directly from the real PDD's physical specs: active volume 4,650 m³ ÷ HRT 1.87 days = **2,486.6 m³/day** → **75,593.6 m³/month** at steady-state (✅ derived from real PDD numbers).

COD concentration into the digester (~) set at 20 kgCOD/m³, typical raw starch-processing wastewater.

Monthly site temperature (~) uses a realistic Thailand seasonal profile (cooler Dec–Feb, peak Apr–May):

| Month | F_dig,m (m³) | COD_dig,m (kgCOD/m³) | T2,m (K) |
|---|---|---|---|
| 1 (Jan) | 75,593.6 | 20 | 297 |
| 2 (Feb) | 75,593.6 | 20 | 298 |
| 3 (Mar) | 75,593.6 | 20 | 300 |
| 4 (Apr) | 75,593.6 | 20 | 302 |
| 5 (May) | 75,593.6 | 20 | 302 |
| 6 (Jun) | 75,593.6 | 20 | 301 |
| 7 (Jul) | 75,593.6 | 20 | 300 |
| 8 (Aug) | 75,593.6 | 20 | 300 |
| 9 (Sep) | 75,593.6 | 20 | 300 |
| 10 (Oct) | 75,593.6 | 20 | 299 |
| 11 (Nov) | 75,593.6 | 20 | 298 |
| 12 (Dec) | 75,593.6 | 20 | 297 |

---

## 3. Electricity baseline (Eq.13) — real PDD values

| Field | Description | Value | Source |
|---|---|---|---|
| `elflag` (56) | BE_EL applicable? | **1** | ✅ |
| `EC_BL` (57) | Baseline grid electricity consumption | **0** MWh | ✅ Baseline scenario has no separate grid draw beyond the displaced generation below |
| `EF_BL,EL,y` (58) | Baseline grid EF | **0.448** tCO₂/MWh | ✅ Real PDD Table 9, Thailand grid |
| `EG_PJ,y` (59) | Project electricity generated | **3,406** MWh/yr | ✅ Real PDD — 450 kW GUASCOR generator output |
| `EF_PJ,EL,y` (60) | Project grid EF | **0.448** tCO₂/MWh | ✅ Same source as above |

→ **BE_EL,y = 1,525.9 tCO₂e** (matches real PDD's 1,526 almost exactly)

## 4. Heat baseline (Eq.14) — real PDD values

| Field | Description | Value | Source |
|---|---|---|---|
| `hgflag` (61) | BE_HG applicable? | **1** | ✅ |
| `HG_PJ,y` (62) | Project heat generated | **66.35** TJ | ✅ Real PDD — hot-oil burners |
| `EF_boiler` (63) | Boiler emission factor | **77.4** tCO₂/TJ | ✅ Real PDD Table 10 |
| `eta` (64) | Baseline boiler efficiency | **1.0** | ~ Boundary value used to match the PDD's own reported figure exactly; a stricter (<1) baseline efficiency assumption would scale BE_HG down proportionally |

→ **BE_HG,y = 5,135.5 tCO₂e** (matches real PDD's 5,135 almost exactly)

## 5. Land application / solid-material leakage — not applicable, per real project

| Field | Description | Value | Source |
|---|---|---|---|
| `laflag` (68) | Land application applicable? | **0** | ✅ Real project doesn't land-apply sludge/wastewater |
| `smflag` (74) | Solid-material diversion applicable? | **0** | ✅ Not part of this project's configuration |
| `defd` (76) | Solid-material leakage factor | **1** | Methodology-fixed value, unused since smflag=0 |

All of fields 69–73, 75 → **0** (inactive branches, per the schema's own instructions).

## 6. Flaring — not applicable in normal operation, per real project

| Field | Description | Value | Source |
|---|---|---|---|
| `flrflag` (81) | Flaring applicable? | **0** | ✅ Real PDD: "flare not utilized in normal operation" |
| `fch4` (82) | Methane sent to flare | **0** | ✅ |
| `etaflr` (83) | Flare destruction efficiency | 0.9 | Unused since flrflag=0 |

## 7. Digester project emissions + leakage — direct entry, real PDD total

| Field | Description | Value | Source |
|---|---|---|---|
| `pey` (45) | Digester PE, direct entry | **13,712** | ✅ Real PDD: PE_effluent (3,751) + PE_digest/biogas-leakage (9,961) = 13,712 |
| `ley` (46) | Leakage, direct entry | **0** | ✅ Real project's leakage is already captured inside the PE figure above; no separate leakage source disclosed |

## 8. Reference documents & metadata

| Field | Description | Value |
|---|---|---|
| `field0` | Report ID | `MR-2026-001-ChokChai-Ref` |
| Reference to PD document | text | `PD-ChokChai-ACM0014-2026` |
| Reference to Monitoring Period | text | `MP-2026-Annual-01` |
| Date submitted | date | today's date |
| Submitting proponent | text | your project entity name |

---

## Computed results (what the engine should now produce)

| Output | Value | vs. real PDD (v2.1) |
|---|---|---|
| `codpjy` (annual COD treated) | 18,142.5 tCOD | — |
| `codbly` (baseline COD) | 15,421.1 tCOD | — |
| `fd` (depth factor) | 0.7 | — |
| `fTy` (temperature factor) | 0.742 | — |
| `mcf` (methane conversion factor) | 0.462 | — |
| `bey` (BE_CH₄) | **41,903.7 tCO₂e** | real PDD: 65,048 |
| `BE_y,total` (field67) | **48,565.1 tCO₂e** | real PDD: 71,709 |
| `PE_y,total` (field79) | **13,712 tCO₂e** | real PDD: 13,712 ✅ exact |
| `LE_y,total` | **0 tCO₂e** | — |
| **`ER_y` / mint field (field55)** | **34,853.1 tCO₂e** | real PDD: 57,997 |

**Why BE_CH₄ doesn't match exactly, and why that's expected, not a bug:** BE_EL, BE_HG, and PE_total all reproduce the real project's disclosed PDD figures almost exactly, because those come straight from real, published table values. BE_CH₄ doesn't, because it depends on monthly COD concentration and temperature data the PDD's public summary tables don't disclose at that granularity (that's the Appendix 1 spreadsheet Verra's registry lists but doesn't make downloadable, mentioned earlier in this thread). What's here is a realistic reconstruction using the same real digester physical specs (volume, HRT, flow) and a plausible COD/temperature profile — not the classified monthly data. It's also expected to differ structurally: this policy implements ACM0014 **v8.0**'s van't Hoff-Arrhenius engine, while the real project registered under the older, simpler **v2.1** MCF approach — the methodology itself changed between those versions, so an exact match was never going to be the right bar. The result is a materially real, internally consistent, non-trivial positive mint value — not a placeholder `1`-driven artifact — which is the actual goal here.
