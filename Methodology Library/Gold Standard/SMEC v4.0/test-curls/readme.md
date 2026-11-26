# Test curls

API templates for exercising the SMEC v4.0 policy on a running Guardian
instance (dry-run mode recommended - no Hedera/IPFS side effects).

- `01-pdd.txt` - submit a synthetic PDD
- `02-er.txt` - submit a synthetic ER document; the expected result is
  fixture T1 (`er_y = 726.66552832 tCO2e`, see `../test-fixtures/`)

Replace `<YOUR_GUARDIAN_HOST>`, `<POLICY_ID>`, `<BLOCK_ID>`, and
`<YOUR_GUARDIAN_API_TOKEN>`. Block IDs come from the policy's tag list
(`pp_project_description_form`, `pp_er_form`).
