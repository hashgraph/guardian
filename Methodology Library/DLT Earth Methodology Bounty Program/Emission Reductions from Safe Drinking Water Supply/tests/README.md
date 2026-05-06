# Tests

This folder contains the canonical TC1 specification and a recorded MGS
dry-run that exercises the full policy lifecycle.

## Files

| File | Purpose |
|---|---|
| `tc1_expected.json` | Canonical TC1 input/output specification — the oracle every other artefact reproduces |
| `tc1_full_lifecycle.record` | Recorded MGS dry-run (role choice → PP profile → project creation → monitoring report → VVB approve → owner approve → mint) |

Expected outcomes match [`../evidence/CANONICAL_TC1.md`](../evidence/CANONICAL_TC1.md):
`ER_total = 10.00 tCO₂e` → mint **1000 base units** (= 10.00 CER, decimals = 2)
on token `0.0.8865898`.

## Honest note on the binary fixture

`tc1_full_lifecycle.record` was recorded against an earlier build of the
policy that used a 1000-household input set. The canonical TC1 input set in
`tc1_expected.json` (200 HH, `f_woody = 0.60`, `wq_pass_rate = 0.98`,
expected mint = 1000 base units) is the single source of truth. The
recording will be re-captured against the current `VMR0015.policy` build
(with the `wq < 0.95` hard gate and dormant `calculate_project_fields`
removed) before the v1.0.0 tag is cut; until then, prefer the oracle path:

```bash
python3 tools/verify_oracle.py
```

This re-runs the canonical TC1 inputs against a Python port of the policy
math and returns `Result : PASS` if the math layer is consistent with the
specification.

## To replay the recorded fixture

1. Import `VMR0015.policy` into a fresh MGS instance.
2. Open the policy in Test mode.
3. Load `tc1_full_lifecycle.record`.
4. Run; the recording exercises the full lifecycle. The legacy mint
   amount will reflect the older 1000-HH input set, not the canonical TC1
   inputs in `tc1_expected.json`.

## To produce a fresh canonical-TC1 recording

1. Import `VMR0015.policy` into a fresh MGS instance.
2. Open the policy in Test mode.
3. Walk the lifecycle by hand using the inputs in `tc1_expected.json`
   (200 households, BE_woody = 8.00, BE_fossil = 4.00, PE = 0.40 / 0.20 / 0.30 / 0.10,
   LE_woody = 0.80, LE_fossil = 0.20, water-quality test array with
   `wq_pass_rate ≈ 0.98`).
4. Confirm the mint event shows **1000 base units** on token `0.0.8865898`.
5. Save the recording back to `tc1_full_lifecycle.record`.
