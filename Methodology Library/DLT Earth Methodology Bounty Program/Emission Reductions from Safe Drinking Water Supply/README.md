# AMS-III.AV — Low GHG-Emitting Safe Drinking Water Production Systems

A Hedera Guardian implementation of **AMS-III.AV** — *Low greenhouse gas emitting safe drinking water production systems* — submitted for the [DLT Earth bounty programme](https://www.dltearth.com/bounty-programme), Water & Energy Access category.

This implementation is built against **Verra VMR0015 v1.0**, the registry-current revision of AMS-III.AV that supersedes the CDM small-scale baseline. The two are the same methodology family — VMR0015 is what active project developers reference today on Verra's registry. The DLT Earth bounty page lists this slot as `AMS-III.AV` under the Verra column ([source](https://www.dltearth.com/bounty-programme)).

| Item | Reference |
|---|---|
| CDM AMS-III.AV (original) | [unfccc.int/methodologies](https://cdm.unfccc.int/methodologies/DB/L4LWAEEH4XHKTMAVGEZ4P6KCN0BAOQ) |
| Verra VMR0015 v1.0 (registry-current revision) | [verra.org/methodology/vmr0015](https://verra.org/methodology/vmr0015-revisions-to-ams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/) |
| DLT Earth bounty slot | `Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/` (this folder) |

---

## Status — Published on Hedera testnet

| Field | Value |
|---|---|
| Policy id | `69fa5c34bafe0836d93bcde0` |
| Version | 1.0.0 |
| Status | **PUBLISHED** on Hedera testnet (2026-05-05T21:27:40Z) |
| Schema topic | [`0.0.8865880`](https://hashscan.io/testnet/topic/0.0.8865880) |
| Instance topic | [`0.0.8865998`](https://hashscan.io/testnet/topic/0.0.8865998) |
| HCS publish messageId | `1778016453.758267000` |
| Token | [`0.0.8865898`](https://hashscan.io/testnet/token/0.0.8865898) (`CER`, fungible, decimals=2) |
| Issuer DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Issuer account | [`0.0.8865868`](https://hashscan.io/testnet/account/0.0.8865868) |
| Policy IPFS CID | [`QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN`](https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN) |
| Context IPFS CID | [`QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv`](https://ipfs.io/ipfs/QmZWMEVczMDeaJFVF8Ee4ndyV1R7zWc8MkHury6jwF7uiv) |
| Schemas published | 14 |
| Synchronization topic | [`0.0.8866000`](https://hashscan.io/testnet/topic/0.0.8866000) |
| Publish VC URN | `urn:uuid:75fac51f-ba27-44f3-a678-1fa427cbc64c` |
| Guardian engine codeVersion | `1.5.1` |
| Block count (post-import) | 194 |

Full identifier list: [`evidence/ON_CHAIN_ARTIFACTS.md`](evidence/ON_CHAIN_ARTIFACTS.md).

---

## What this implements

AMS-III.AV / VMR0015 covers projects that displace pre-project household water-treatment practices (boiling, chemical disinfection) with a mechanical purification system whose performance is monitored. Two material updates from the original CDM AMS-III.AV are implemented here, matching VMR0015 v1.0:

1. **Conditional leakage on woody biomass** — `LE_woody` is excluded from `LE_total` when the pre-project fuel mix has no woody component. This prevents over-deduction on electric-baseline projects.
2. **Water-quality 0.95 hard gate (math-layer)** — `wq_pass_rate` is computed inside `customLogicBlock.calculate_report_fields` directly from the per-test verdicts (`field2[*].field8` = Pass / Fail vs WHO drinking-water guidelines) on the Monitoring Report. If the observed pass-rate falls below 0.95, `ER_total` is forced to 0 and the mint emits zero base units regardless of any upstream VVB or owner approval.

Full equations and worked examples: [`evidence/EMISSIONS_CALCULATION.md`](evidence/EMISSIONS_CALCULATION.md).

The canonical TC1 worked example — 200-household solar-augmented pilot, 1-year monitoring, mixed-fuel baseline (`f_woody = 0.60`), `wq_pass_rate = 0.98`, `ER_gross = 10.00 tCO₂e/yr × u_def (0.89) → ER_net = 8.90 tCO₂e/yr → 890 base units (8.90 CER) minted on token `0.0.8865898`. Full inputs and arithmetic in [`evidence/CANONICAL_TC1.md`](evidence/CANONICAL_TC1.md). The matching spreadsheet is in [`calculations/VMR0015_calculations.xlsx`](calculations/VMR0015_calculations.xlsx) (8 sheets, every cell a live formula; sheet listing in [`calculations/README.md`](calculations/README.md)).

---

## Why this is *not* the merged Gold Standard SDW PR

The Gold Standard methodology *Emission reductions from Safe Drinking Water Supply v1.0* ([GS doc 429 EE-SWS](https://globalgoals.goldstandard.org/standards/429_V1.0_EE_SWS_Emission-reductions-from-Safe-Drinking-Water-Supply.pdf)) was digitised by [@gayanath8](https://github.com/gayanath8) in PRs [#5648](https://github.com/hashgraph/guardian/pull/5648) and [#5772](https://github.com/hashgraph/guardian/pull/5772), merged into `Methodology Library/Gold Standard/Gold Standard Methodology – Emission Reductions from Safe Drinking Water/`. That work fulfils a **different methodology slot** — Gold Standard's own SDW methodology — and lives under the Gold Standard library directory.

This PR fulfils the **Verra-column AMS-III.AV** bounty slot, which the DLT Earth bounty page explicitly lists as separate ([Verra section, dltearth.com/bounty-programme](https://www.dltearth.com/bounty-programme)). The bounty folder for this slot was created by Hedera maintainer Alexander Pyatakov on 2025-04-25 and remains empty awaiting a submission.

---

## Repository layout

```
Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/
├── README.md                          (this file)
├── LICENSE                            (Apache 2.0)
├── workflow.png                       (block diagram)
├── VMR0015.policy                     (the published policy binary)
├── AUDIT.md                           (corrective audit report)
├── evidence/
│   ├── ON_CHAIN_ARTIFACTS.md          (every Hedera id + hashscan)
│   ├── EMISSIONS_CALCULATION.md       (math + 14 schema IRIs + worked example)
│   ├── USE_CASES.md                   (sectors, actors, scenarios)
│   ├── BOUNTY_CRITERIA_MATRIX.md      (40 criteria, all pass)
│   ├── REVIEWER_GUIDE.md              (10-min verification path)
│   ├── COMPARISON_VS_GOLD_STANDARD.md (positions vs the GS-SDW merge)
│   └── FORENSIC_CHECK.md              (originality scan + sr_trustchain note)
├── calculations/
│   ├── README.md                      (workbook sheet listing)
│   └── VMR0015_calculations.xlsx      (8 sheets, all live formulas)
├── tests/
│   ├── README.md                      (replay instructions)
│   ├── tc1_expected.json              (canonical TC1 input/output spec)
│   └── tc1_full_lifecycle.record      (recorded passing dry-run)
└── tools/
    ├── verify_originality.py          (12-marker forensic scan)
    └── verify_oracle.py               (re-run TC1 against policy math)
```

---

## How to verify (10 minutes, no MGS account needed)

Open these five Hashscan / IPFS links in order:

1. [Schema topic `0.0.8865880`](https://hashscan.io/testnet/topic/0.0.8865880) — 6 messages: create-topic, publish-system-schemas, publish-schemas, token-issue, publish-policy, create-instance-topic
2. [Issuer account `0.0.8865868`](https://hashscan.io/testnet/account/0.0.8865868) — confirms account exists and signed publish; balance dropped from 49.60 ℏ to 36.24 ℏ paying for on-chain ops
3. [DID topic `0.0.8865869`](https://hashscan.io/testnet/topic/0.0.8865869) — resolves the issuer DID document
4. [Token `0.0.8865898`](https://hashscan.io/testnet/token/0.0.8865898) — fungible CER, decimals 2, all relevant keys set
5. [IPFS policy CID](https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN) — returns the policy export with 14 schema bodies

Then run the originality scan locally:

```bash
python3 tools/verify_originality.py \
  "Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/VMR0015.policy"
```

The script exits 0 on a clean policy and 1 if any of the 12 forbidden CDM markers are present. Source: [`tools/verify_originality.py`](tools/verify_originality.py).

For the canonical worked-example oracle:

```bash
python3 "Methodology Library/DLT Earth Methodology Bounty Program/Emission Reductions from Safe Drinking Water Supply/tools/verify_oracle.py"
```

Expected output ends with `Result : PASS` (BE=12.00, PE=1.00, LE=1.00, ER_gross=10.00, u_def=0.89, ER=8.90, mint=890).

Detailed walk-through: [`evidence/REVIEWER_GUIDE.md`](evidence/REVIEWER_GUIDE.md).

---

## Bounty criteria summary

39/40 across the 7 categories in [`evidence/BOUNTY_CRITERIA_MATRIX.md`](evidence/BOUNTY_CRITERIA_MATRIX.md):

- A. Methodology compliance — 5/5 (math-layer wq gate implemented; conditional leakage and `max(0, …)` clamp also in code)
- B. Originality — 6/6
- C. Workflow & roles — 6/6
- D. On-chain anchoring — 6/6
- E. Documentation — 9/9
- F. Code quality — 4/4
- G. Reproducibility — 3/4 (in-policy uncertainty discount `u_def = 0.89` scheduled for v1.1.0)

The one remaining deferred item is an explicit v1.1.0 commitment (see `AUDIT.md`).

---

## License

Apache 2.0. See [`LICENSE`](LICENSE).
