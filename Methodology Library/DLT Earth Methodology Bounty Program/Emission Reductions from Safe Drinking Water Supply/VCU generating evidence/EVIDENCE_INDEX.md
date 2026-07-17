# Evidence Index — Canonical VCS 3599 Mint (Hedera testnet dry-run, 2026-06-14)

Policy instance `6a2eb894426a35901046de88` · token `0e34f609-b42b-4790-962c-0113826ec7b1`
Monitoring Report schema `#e0013904-d742-446e-a060-5fd210eb54ae`

| # | File | Type | Signer (role) | Time (UTC) | Key content |
|---|---|---|---|---|---|
| 01 | 01_PUBLISH_VC.json | Policy PUBLISH | SR (HA7FYHQ) | 14:20:21 | Policy&1.0.0, isMintNeeded=true |
| 02 | 02_MR_submit_PP.json | Monitoring Report | PP (5TTFXdok) | 16:53:17 | **ER field blank on entry** → field3=162241.14, field6=154125.14 |
| 03 | 03_MR_verify_VVB.json | Monitoring Report | VVB (Kfcqsan4) | 16:54:57 | values preserved |
| 04 | 04_MR_approve_SR.json | Monitoring Report | SR (HA7FYHQ) | 16:55:14 | values preserved |
| 05 | 05_MintToken_154125.json | MintToken VC | SR (HA7FYHQ) | 16:55:14 | **amount = 154125.14** |
| 06 | 06_VerifiablePresentation.json | VP | SR (HA7FYHQ) | 16:55:14 | bundles MR + MintToken (Trustchain anchor) |

All credentials are Ed25519-signed by the dry-run DIDs.

**What this proves:** the Emission Reductions value was NOT entered by the user — it was computed
on-chain by `calculate_report_fields` from the monitored parameters and carried through to the mint.
The minted amount (154,125.14) equals the computed ER and matches the Verra VCS 3599 registry issuance.
