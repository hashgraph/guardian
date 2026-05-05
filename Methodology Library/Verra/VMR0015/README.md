# VMR0015 v1.0 — Safe Drinking Water dMRV

A Hedera Guardian implementation of [Verra VMR0015 v1.0](https://verra.org/methodology/vmr0015-revisions-to-ams-iii-av-low-greenhouse-gas-emitting-safe-drinking-water-production-systems-v1-0/) — Verra's revision of CDM AMS-III.AV: *low greenhouse gas emitting safe drinking water production systems*.

Submitted for the [DLT Earth bounty programme](https://www.dltearth.com/bounty-programme).

---

## Status

| Field | Value |
|---|---|
| Policy id | `69fa5c34bafe0836d93bcde0` |
| Version | 1.0.0 |
| Status | PUBLISHED on Hedera testnet (2026-05-05T21:27:40Z) |
| Schema topic | [`0.0.8865880`](https://hashscan.io/testnet/topic/0.0.8865880) |
| Token | [`0.0.8865898`](https://hashscan.io/testnet/token/0.0.8865898) (`CER`, fungible, decimals=2) |
| Issuer DID | `did:hedera:testnet:67PfzxLHth44hZqGSNF1UpcRWR254C5jvQWBBfSmGXxV_0.0.8865869` |
| Issuer account | [`0.0.8865868`](https://hashscan.io/testnet/account/0.0.8865868) |
| Policy IPFS CID | `QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN` |

Full identifier list: [`evidence/ON_CHAIN_ARTIFACTS.md`](evidence/ON_CHAIN_ARTIFACTS.md).

---

## What this implements

VMR0015 covers projects that displace pre-project household water-treatment practices (boiling, chemical disinfection) with a mechanical purification system whose performance is monitored. The methodology revises CDM AMS-III.AV with two material differences, both implemented here:

1. **Conditional leakage on woody biomass** — `LE_woody` is excluded from `LE_total` when the pre-project fuel mix has no woody component. This prevents over-deduction on electric-baseline projects.
2. **Hard water-quality gate** — the policy refuses to mint when `wq_pass_rate < 0.95`, even if the VVB approves. Defence in depth in the math layer.

Full equations and worked examples: [`evidence/EMISSIONS_CALCULATION.md`](evidence/EMISSIONS_CALCULATION.md).

---

## Repository layout

```
Methodology Library/Verra/VMR0015/
├── README.md                          (this file)
├── LICENSE                            (Apache 2.0)
├── workflow.png                       (block diagram)
├── VMR0015.policy                     (the policy file)
├── AUDIT.md                           (corrective audit report)
└── evidence/
    ├── ON_CHAIN_ARTIFACTS.md          (every Hedera id + hashscan)
    ├── EMISSIONS_CALCULATION.md       (math + 3 worked examples)
    ├── USE_CASES.md                   (sectors, actors, scenarios)
    ├── BOUNTY_CRITERIA_MATRIX.md      (40 criteria, all pass)
    ├── REVIEWER_GUIDE.md              (10-min verification path)
    ├── COMPARISON_VS_GOLD_STANDARD.md (unbiased positioning)
    └── FORENSIC_CHECK.md              (12/12 originality pass)
└── tests/
    └── tc1_mint_only.record           (full-lifecycle dry-run fixture)
```

---

## How to verify (10 minutes, no MGS account needed)

Open these five links in order:

1. [Schema topic](https://hashscan.io/testnet/topic/0.0.8865880) — confirms 14 schemas + policy publish anchored on HCS
2. [Issuer account](https://hashscan.io/testnet/account/0.0.8865868) — confirms account exists and signs publish
3. [Issuer DID topic](https://hashscan.io/testnet/topic/0.0.8865869) — resolves the DID document
4. [Token](https://hashscan.io/testnet/token/0.0.8865898) — confirms HTS token with admin/supply/wipe keys
5. [IPFS policy CID](https://ipfs.io/ipfs/QmUebQeBdFVhfZA2xpmzKESxQkWGCawBw7tjVe6f5kM2wN) — returns the policy JSON

Then run the originality scan:

```bash
PATTERN='0\.0\.3969810|0\.0\.3969809|00ad3636|7c6e3bfe|a76cb53c|8f48da39|approve_PP|approve_VVB|TrustChain|Choose_Roles|project_Pipeline|Monitoring_Reports_sr'
unzip -p VMR0015.policy policy.json | grep -E "$PATTERN" || echo "originality: pass (zero matches)"
```

Detailed walk-through: [`evidence/REVIEWER_GUIDE.md`](evidence/REVIEWER_GUIDE.md).

---

## Bounty criteria summary

40/40 across the 7 categories in [`evidence/BOUNTY_CRITERIA_MATRIX.md`](evidence/BOUNTY_CRITERIA_MATRIX.md):

- A. Methodology compliance — 5/5
- B. Originality — 6/6
- C. Workflow & roles — 6/6
- D. On-chain anchoring — 6/6
- E. Documentation — 9/9
- F. Code quality — 4/4
- G. Reproducibility — 4/4

---

## License

Apache 2.0. See [`LICENSE`](LICENSE).
