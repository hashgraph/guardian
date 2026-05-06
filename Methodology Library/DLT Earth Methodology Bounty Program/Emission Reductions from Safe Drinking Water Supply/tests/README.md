# Tests

This folder contains the canonical TC1 specification and a recorded MGS
dry-run that exercises the full policy lifecycle against the current
`VMR0015.policy` build.

## Files

| File | Purpose |
|---|---|
| `tc1_expected.json` | Canonical TC1 input/output specification — the oracle every other artefact reproduces |
| `tc1_full_lifecycle.record` | Recorded MGS dry-run (role choice → PP profile → project registration → monitoring report → water-quality block → VVB validation → VVB verification → owner confirmation) |

Expected outcomes match [`../evidence/CANONICAL_TC1.md`](../evidence/CANONICAL_TC1.md):
`ER_total = 10.00 tCO₂e` → mint **1000 base units** (= 10.00 CER, decimals = 2)
on token `0.0.8865898`.

## About the recording

`tc1_full_lifecycle.record` is an MGS dry-run recording captured against
the current `VMR0015.policy` build (with the `wq < 0.95` hard gate active
in `customLogicBlock.calculate_report_fields` and the dormant
`calculate_project_fields` block removed). It walks the institutional-pilot
lifecycle end to end, including the water-quality (`wqrequest`) block, so
reviewers can verify the math-layer wq-gate is exercised.

## Oracle (preferred reproducibility path)

```bash
python3 tools/verify_oracle.py
```

This re-runs the canonical TC1 inputs (200 HH, `f_woody = 0.60`,
`wq_pass_rate = 0.98`) against a Python port of the policy math and
returns `Result : PASS` if the math layer is consistent with the
specification (BE = 12.00, PE = 1.00, LE = 1.00, ER = 10.00,
mint_base_units = 1000).

## To replay the recorded fixture

1. Import `VMR0015.policy` into a fresh MGS instance.
2. Open the policy in Test mode.
3. Load `tc1_full_lifecycle.record`.
4. Run; the recording exercises the full lifecycle including the
   water-quality block.

## To produce a fresh canonical-TC1 recording

1. Import `VMR0015.policy` into a fresh MGS instance.
2. Open the policy in Test mode.
3. Walk the lifecycle by hand using the inputs in `tc1_expected.json`
   (200 households, BE_woody = 8.00, BE_fossil = 4.00, PE = 0.40 / 0.20 / 0.30 / 0.10,
   LE_woody = 0.80, LE_fossil = 0.20, water-quality test array with
   `wq_pass_rate ≈ 0.98`).
4. Confirm the mint event shows **1000 base units** on token `0.0.8865898`.
5. Save the recording back to `tc1_full_lifecycle.record`.
