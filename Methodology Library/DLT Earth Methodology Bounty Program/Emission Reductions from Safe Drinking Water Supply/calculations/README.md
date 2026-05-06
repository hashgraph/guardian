# Calculations workbook

`VMR0015_calculations.xlsx` is a live-formula workbook that mirrors the policy's
math. It contains 8 sheets:

| Sheet | Purpose |
| --- | --- |
| `README` | This index |
| `EmissionFactors` | Reference factors (fNRB, NCV, EF) sourced from AMS-III.AV / VMR0015 §5 |
| `Baseline` | BE_woody / BE_fossil computation |
| `Project` | PE_* line-item computation |
| `Leakage` | LE_woody / LE_fossil with `f_woody` conditional |
| `ER_NetCalc` | BE − PE − LE with `max(0, …)` clamp |
| `WorkedExample` | Canonical TC1 — must reproduce 10.00 tCO₂e (links to `evidence/CANONICAL_TC1.md`) |
| `PolicyMapping` | Maps each workbook variable to a `field*` path inside the policy `customLogicBlock` |

Every result cell is a live formula. Verify by changing any input and watching
`WorkedExample!D26` (ER_total) recompute.

Source-of-truth for inputs and expected output: [`../evidence/CANONICAL_TC1.md`](../evidence/CANONICAL_TC1.md).

## Canonical TC1 expected output

Running the workbook with default canonical inputs produces:

| Cell | Value |
| --- | --- |
| `WorkedExample!D23` (BE_total) | 12.00 |
| `WorkedExample!D24` (PE_total) | 1.00 |
| `WorkedExample!D25` (LE_total) | 1.00 |
| `WorkedExample!D26` (ER_total) | **10.00** tCO₂e |
| `WorkedExample!D27` (Mint_base_units) | **1000** |
| `WorkedExample!D28` (Mint_readable) | **10.00 CER** on token `0.0.8865898` |
