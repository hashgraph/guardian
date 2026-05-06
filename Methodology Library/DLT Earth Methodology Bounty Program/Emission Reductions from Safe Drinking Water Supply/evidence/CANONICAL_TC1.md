# Canonical worked example — TC1

This is the single source of truth for the worked example referenced from
`README.md`, `REVIEWER_COVER_NOTE.md`, `evidence/USE_CASES.md`,
`evidence/EMISSIONS_CALCULATION.md` §5, and the `WorkedExample` sheet of
`calculations/VMR0015_calculations.xlsx`. Any change to the example must be
made here first; other files link to this one.

## Pilot

200-household solar-augmented safe-drinking-water pilot, 1-year monitoring
period, mixed baseline fuel mix (woody biomass + LPG), water quality above
the 0.95 documentation threshold.

## Inputs

| Parameter | Value | Unit |
| --- | --- | --- |
| Households served (`N_HH`) | 200 | HH |
| Monitoring period | 365 | days |
| Pre-project woody fraction (`f_woody`) | 0.60 | unitless |
| Pre-project LPG fraction (`f_fossil`) | 0.40 | unitless |
| Water-quality pass-rate (`wq_pass_rate`) | 0.98 | unitless (≥0.95 documentation gate) |
| `BE_woody` | 8.00 | tCO₂e/yr |
| `BE_fossil` | 4.00 | tCO₂e/yr |
| `PE_electricity` | 0.40 | tCO₂e/yr |
| `PE_transport` | 0.20 | tCO₂e/yr |
| `PE_manufacturing` (annualised) | 0.30 | tCO₂e/yr |
| `PE_aux` | 0.10 | tCO₂e/yr |
| `LE_woody` (included because `f_woody > 0`) | 0.80 | tCO₂e/yr |
| `LE_fossil` | 0.20 | tCO₂e/yr |

## Computation (matches policy `customLogicBlock` exactly)

```
BE_total = BE_woody + BE_fossil = 8.00 + 4.00 = 12.00
PE_total = PE_electricity + PE_transport + PE_manufacturing + PE_aux = 1.00
LE_total = (f_woody > 0 ? LE_woody : 0) + LE_fossil = 0.80 + 0.20 = 1.00
ER_raw   = BE_total - PE_total - LE_total = 12.00 - 1.00 - 1.00 = 10.00
ER_total = max(0, ER_raw) = 10.00
```

## Outputs

| Output | Value |
| --- | --- |
| `ER_total` (field7) | **10.00 tCO₂e/yr** |
| Mint (decimals=2) | `floor(10.00 × 100)` = **1000 base units** |
| Mint readable | **10.00 CER** on token `0.0.8865898` |

## Notes on what is and is not in the math layer

- `u_def = 0.89` (uncertainty discount per AMS-III.AV §B.7.4) is applied in
  the `calculations/VMR0015_calculations.xlsx` workbook only, not in the
  policy `customLogicBlock`. v1.1.0 will move it into the policy.
- `wq_pass_rate < 0.95` is currently a documentation gate enforced by VVB
  review, not by `customLogicBlock` math. v1.1.0 will add a hard gate
  (`if (wq_pass < 0.95) ER_total = 0`) directly inside the calc block.
- Per-household yield in this example is `10.00 / 200 = 0.05 tCO₂e/HH/yr`,
  consistent with Verra-registered VMR0015 / AMS-III.AV mixed-fuel projects.
