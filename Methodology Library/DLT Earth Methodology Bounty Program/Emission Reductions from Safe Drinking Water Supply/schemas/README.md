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
| Project Description | `#3aa3e3d4` | Project registration document |
| Monitoring Period | `#0a6969fe` | Defines a monitoring period |
| **Monitoring Report** | `#31d7ef1c` | **Carries BE/PE/LE/ER totals — the calculation input** |
| ER Summary | `#26b79363` | Output schema of the calculation block |
| Baseline Emissions | `#e38ecb5a` | Baseline emissions detail |
| Project Emissions | `#610437cc` | Project emissions detail |
| Leakage Estimate | `#c13a8490` | Leakage detail |
| Water Quality Test | `#4e99adde` | Water-quality sampling (supports the optional WQ gate) |
| Device Installation Record | `#0ca0a899` | Per-device installation data |
| Maintenance Log | `#4123eee8` | Device maintenance records |
| Household Survey | `#c3e7e997` | Usage/adoption survey |
| Geographic Location | `#63621fda` | Location data |
| Issuance Request | `#99a66994` | Credit issuance request |
| Policy Registry Index | `#ab6df1ae` | Registry index document |
| PP Profile | `#8d367c3c` | Project Proponent profile |
| VVB Profile | `#e6709e9c` | Validation/Verification Body profile |
| VVB Verification Report | `#9ef9ee07` | VVB verification document |

## Key fields — Monitoring Report (`#31d7ef1c`)

The calculation block and the formula linked definitions both operate on these:

| Field | Title | Meaning |
|---|---|---|
| `field3` | BE Total (tCO₂e) | Baseline Emissions total |
| `field4` | PE Total (tCO₂e) | Project Emissions total |
| `field5` | LE Total (tCO₂e) | Leakage Emissions total |
| `field6` | ER Total (tCO₂e) | Emission Reductions — computed by the policy; MintToken rule |
