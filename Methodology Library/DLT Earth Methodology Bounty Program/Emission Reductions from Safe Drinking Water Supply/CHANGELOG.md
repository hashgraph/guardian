# VMR0015 v1.0 Safe Drinking Water dMRV — Guardian Policy

**Author:** Bikram Biswas
**Policy file:** `VMR0015-v3.3.2-CLEAN-FINAL.policy` (Guardian import, version 2.0.0, codeVersion 1.5.1)
**Methodology:** VMR0015 Revision to AMS-III.AV. — Low greenhouse gas emitting safe drinking water production systems, v1.0

---

## 1. Methodology alignment (Verra)

This policy implements **VMR0015 v1.0**, published by Verra and **active since 31 October 2025**, which revises and replaces the CDM methodology **AMS-III.AV.** as a standalone methodology under the VCS Program.
Source: https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/

Core emission-reduction equation (VMR0015 §3.9.1 / AMS-III.AV.):

```
ER_y = BE_y − PE_y − LE_y
```

The policy maps this directly onto the Monitoring Report schema and applies a conservativeness factor (u_def = 0.89) in the on-chain calculation:

```
field6 (ER) = (field3 [BE] − field4 [PE] − field5 [LE]) × 0.89   ; negative clamps to 0
```

VMR0015 key updates over AMS-III.AV. reflected in scope: updated fraction-of-non-renewable-biomass approach; leakage adjustment factor set at validation; updated emission factors for non-renewable woody biomass and fossil fuels; REDD+ double-counting assessment; baseline adjustment for interacting technologies; per-device data compilation requirements. VMR0015 must be used with the most recent version of AMS-III.AV.

---

## 2. Test data — real, registered Verra project

There is **no registered VMR0015 project yet** (the methodology was only published 31 Oct 2025). The test data is therefore grounded in a **real, registered Verra (VCS) project under the predecessor methodology AMS-III.AV.**, using its actual verified monitoring figures.

| Field | Value |
|---|---|
| Project | **VCS 3599 — Grouped Projects for Safe Drinking Water for Schools in Viet Nam** |
| Status | Registered |
| Methodology | AMS-III.AV. |
| Proponent | Sustainability Investment Promotion and Development JSC (SIPCO) |
| Crediting period | 04/07/2022 – 03/07/2032 |
| Registry | https://registry.verra.org/app/projectDetail/VCS/3599 |

**Monitoring period used:** 01/01/2025 – 30/06/2025 (most recent verified period, backed by the project's Monitoring Report + Verification Report on the registry). Net verified ER for the period ≈ **154,125 tCO2e**.

**Mapped to policy:** field3 (BE) = 154125, field4 (PE) = 0 (passive purifier — no project combustion), field5 (LE) = 0.
**Computed:** field6 (ER) = (154125 − 0 − 0) × 0.89 = **137,171.25 tCO2e** — intentionally more conservative than Verra's verified figure.

Test fixture: `VMR0015_VCS3599_monitoring_report.json` (Monitoring Report credential subject only; field6 left at 0 for the policy to compute on submission).

---

## 3. Changes in this revision (CHANGELOG)

### Fixed — calculation block reads Monitoring Report as flat (was nested)
- **Symptom:** A correctly filled Monitoring Report computed `field6 = 0`, so the token minted zero.
- **Root cause:** The Monitoring Report schema (`#8d8b1014`) defines `field3`/`field4`/`field5` (BE/PE/LE) as **flat numbers** and `field2` as a "Period Reference" string. The `calculate_report_fields` custom-logic block was reading them as **nested objects** (`raw.field4.field1`, etc.) and treating `field2` as a water-quality array — yielding 0 on every flat report.
- **Fix:** `calculate_report_fields` rewritten to read flat scalars via `toNum(raw.field3/field4/field5)`; `ER = (BE − PE − LE) × 0.89`; negatives clamp to 0. The WHO water-quality gate is now **optional** (applies only if an explicit pass-rate is supplied via `field10` or a `wqSamples` array), so a normal flat report computes correctly.
- **Verification:** flat MR with field3=154125 → field6 = 137,171.25 (matches expected).

### Removed — fabricated policy-integrity-test record
- The earlier bundled `.record` file (`cb0543b3-…record`) was AI-generated and did **not** match this policy's block tags / schema IDs; it would fail on deterministic replay. It has been **removed** from the policy package.
- A valid integrity-test `.record` must be produced by recording a **live Guardian dry-run** of this policy. Not included here; can be generated on request.

---

## 4. Files in this submission

| File | Purpose |
|---|---|
| `VMR0015-v3.3.2-CLEAN-FINAL.policy` | Guardian policy import (calc fix applied; no fabricated record bundled) |
| `VMR0015_VCS3599_monitoring_report.json` | Canonical test data — Monitoring Report credential subject (real VCS 3599 figures) |
| `VMR0015_README_CHANGELOG.md` | This document |

---

## 5. Sources
- Verra VMR0015 v1.0 methodology page — https://verra.org/methodologies/vmr0015-revisiontoams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/
- Verra announcement (31 Oct 2025) — https://verra.org/verra-publishes-revision-to-cdm-methodology-for-water-purification-systems/
- Verra registry — VCS 3599 — https://registry.verra.org/app/projectDetail/VCS/3599
