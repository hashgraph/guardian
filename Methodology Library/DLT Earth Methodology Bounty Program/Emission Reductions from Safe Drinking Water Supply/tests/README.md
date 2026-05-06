# Tests

`tc1_full_lifecycle.record` — recorded MGS dry-run covering the full lifecycle
(role choice → PP profile → project creation → monitoring report → VVB
approve → owner approve → mint). Replays in MGS via the test fixture import.

Expected outcomes are documented in `tc1_expected.json` and must match
[`../evidence/CANONICAL_TC1.md`](../evidence/CANONICAL_TC1.md).

## To replay

1. Import `VMR0015.policy` into a fresh MGS instance.
2. Open the policy in Test mode.
3. Load `tc1_full_lifecycle.record`.
4. Run; confirm mint event shows **1000 base units** on token `0.0.8865898`
   (= 10.00 CER, decimals = 2).
