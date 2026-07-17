# ACM0014 v8.0 Treatment of Wastewater dMRV (Policy ) — Bounty Submission 


## What's honestly still open

- TOOL07 and TOOL09 remain simplified to disclosed manual inputs rather than full sub-calculations.
- Flaring, land-application, and solid-material-leakage branches are validated against hand-calculation and this test fixture, not yet against a real project that uses them.
- No standalone Verra VCS-native ACM0014 project could be located for numerical cross-validation — the real-data anchor here is a CDM-registered project (Chok Chai Starch Co.), reproduced closely on BE_EL/BE_HG/PE_total. ACM0014 itself is confirmed current and Verra-endorsed (cited directly in Verra's own 2025 VM0052 methodology under VCS v5.0), but this specific policy's numbers haven't been checked against a project that's natively VCS-registered under ACM0014.
- **New this round:** Verra's VCS v5.0 transition rules give v4-era methodologies (which describes ACM0014's structure) a grace period through **December 2026** before they need updating to v5.0's standardized-methods format. Not a current blocker — just a dated item worth tracking rather than being surprised by later.

## Test evidence already collected (from our own dry-run testing)

Two independent, complete lifecycle runs — submit → VVB verify → mint — with zero `credentialSubject.undefined` errors, each cross-checked by hand against the formula chain and matching to the last available decimal:

| Run | BE_y,total | PE_y,total | ER_y (mint field) | Minted amount |
|---|---|---|---|---|
| 1 | 32,856.46 | 452.11 | 32,384.347205130754 | 32384.34 ✅ |
| 2 | 33,228.40 | 408.74 | 32,799.65905950902 | 32799.65 ✅ |


Known, disclosed limitations
TOOL07 and TOOL09 remain simplified to manual inputs rather than full sub-calculations.
Flaring, land-application, and solid-material-leakage branches are validated against hand-calculation and my test fixture, not yet against a real project that uses them.
I have not located a standalone Verra VCS-native ACM0014 project for full numerical cross-validation. ACM0014 itself is confirmed current and Verra-endorsed (cited directly in Verra's own 2025 VM0052 methodology under VCS v5.0).
VCS v5.0 transition rules give v4-era methodologies (which describes ACM0014's structure) a grace period through December 2026.
My Policy Integrity Test baseline is specified in this package but not yet registered inside a live Guardian instanc
