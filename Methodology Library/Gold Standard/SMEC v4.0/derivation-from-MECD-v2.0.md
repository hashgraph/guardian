# Derivation from MECD v2.0

SMEC v4.0 and MECD v2.0 are sibling Gold Standard cookstove methodologies:
MECD covers metered devices (electric/fossil/renewable, three quantification
methods); SMEC covers simplified wood/charcoal projects with KPT-based
quantification. This policy was built by transforming the verified MECD v2.0
bundle (`Methodology Library/Gold Standard/Metered Energy Cooking/MECD v2.0/`),
keeping the workflow skeleton and replacing the methodology-specific parts.

## Schema diff (53 → 47)

**Dropped (12)** - MECD-specific:
Baseline Emissions CASE 1/2/3, Baseline Emissions Common Fields, Baseline
Emissions Technology, Project Emissions (Electric MR / Electric PDD /
Renewable / Fossil), Single Device (Electric), Daily Usage (Electric Stoves),
MECD Project Device Fuel Row.

**New (6)** - SMEC-specific:
- `SMEC Baseline Emissions GS` - Option A/B selector (B-KPT vs MSL default),
  90/10 precision fields, cap-threshold check, suppressed-demand evidence
  (sec 7; SMEC 7, 11, 12, 13)
- `SMEC Project Emissions GS` - N_p,y, U_p,y, P-KPT means with 90/10 UB90
  (sec 8; SMEC 17-20)
- `SMEC IAP Assessment GS` (SMEC 4)
- `SMEC End-User Notification GS` - consent + carbon-title waiver (SMEC 16)
- `SMEC Hawthorne Adjustment GS` - option selector, vintage, PTC_m/PTC_KPT
  (SMEC 23; Eq. 17/18)
- `SMEC Usage Survey Row GS` - cohort-sampled annual usage (SMEC 17/18/19)

**Re-fielded in place**: `Device GS` → `SMEC Device GS` (wood/charcoal fuel
class, ISO 19867-1 thermal efficiency with 20/25/30% floors, expected
technical life SMEC 6, replacement measures).

**Rewired**: Emission Reduction Document and Monitoring Report (Auto) now
carry `baseline_emissions` / `project_emissions` sub-records (replacing the
CASE 1/2/3 and per-fuel project-emission splits). All schema references
resolve; all 46 block events intact; 228 blocks, 227 unique tags.

## Engine rewrite

`pp_er_calcs` replaced wholesale with the SMEC Eq. 1-18 chain (MECD's
Method 1/2/3 engine removed). The two mathBlock formula audits rewritten for
the SMEC equations. `calculate_report_fields` (projection) and
`prepare_monitoring_report` (assembly) rewritten for the SMEC document
shape. The daily-MRV external data step became the annual usage-survey
source. New PP forms: end-user notification (SMEC 16), IAP assessment
(SMEC 4), Hawthorne adjustment (SMEC 23).

## Caller contract

`baselineFuelAdjusted` (Eq. 2/3) runs upstream of the calc entry point:
`er_inputs.baselinePairs[*].p_fuel` must carry P_b,adj. `be_unadj_y` and
`be_unc_y` therefore coincide in the audit trail; ER_y is unaffected.
