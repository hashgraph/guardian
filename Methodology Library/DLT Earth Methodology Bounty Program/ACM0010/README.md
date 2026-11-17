# ACM0010 — Vertical Slice

**Status:** isolated architecture proof for [Guardian issue #5945](https://github.com/hashgraph/guardian/issues/5945).
**Not** a bounty submission. Nothing here is published, committed or pushed.

## What this slice proves

1. An ACM0010 `.policy` container can be built, packaged and loaded with the
   repository's own conventions (verified against VM0047 and VM0033).
2. A Guardian `customLogicBlock` can express ACM0010 baseline methane
   quantification (`BE_CH4,y`) and emit a signed VC payload.
3. A Guardian `dataTransformationAddon` can emit a Verra Project Hub CUSTOM
   Project Description payload carrying the **VCS**, **CCB** and **SDVISta**
   program sub-objects required by acceptance criterion 1.
4. The mapping stays structurally consistent with the only existing Project Hub
   reference in the repository (`VM0033.policy`).

## Scope (updated this session)

| In scope (implemented/tested offline) | Out of scope / externally constrained |
|---|---| 
| `BE_CH4,y`, `BE_N2O,y` (Eqs 6-8), staged AWMS/VS decay, direct VS, herd-derived VS (existing Option 3-style scaling path; Eq 4 PDF layout ambiguous), `VSLT` Option 2 dietary intake Eq (3), `VSLT` Option 4 IPCC rate Eq (5) | VSLT Eq (4) exact authoritative term selection/mapping — extracted v09 p.14 layout ambiguous (**REQUIRES EXTERNAL CLARIFICATION**) |
| `PE_Aer,y`, `PE_N2O,y` (Options 1 & 2) | `PE_AD` / anaerobic digester emissions — requires complete implementable TOOL14 equations; local CDM Tool 14 `.tool` is a Guardian tool package, not methodology equation text (**REQUIRES EXTERNAL CLARIFICATION**) |
| Leakage `LE_y` Eq (22), N2O leakage Eqs (23)-(26), CH4 leakage Eqs (31)-(32), `LEAD_y` input support | Full UNFCCC tool formulas (TOOL02/03/05/06/12/14 as applicable) beyond what is implementable from ACM0010 v09 draft (**REQUIRES EXTERNAL CLARIFICATION**) |
| `MD_y` Eq (35), `ER_y` Eq (33), `ER_y,ex post` Eq (34) | VM0050 workflow parity proof (VM0050 not in repo), live Project Hub/runtime evidence |
| `PE_flare,y`, `PE_transport,y`, `PE_elec/heat,y` (implemented/wired/tested) | Guardian runtime import/preview execution, end-to-end workflow, screenshots/video (**BLOCKED**: environment/auth/profile state) |

**Provenance:** ACM0010 v09.0 draft (CDM-MP98-A01) `ACM0010_v09_draft.pdf` + `ACM0010_v09_text.txt` (pp.14-15 extracted for Eq 3/4/5). CDM v08 direct URL not usable as PDF in this environment. Tests (this session): 234 pass/0 fail/0 skip. Artifact: `ACM0010.policy` 40,773 bytes, SHA-256 `37D3D9D8789BC6CC624C8E668C06BD79B255CE3FEFD8360DAA56DB1CCB073AE5`. Runtime (read-only): `127.0.0.1:3301` up; unauth preview → 401, authorized SR bearer → preview 422 `User is not registered` (SR `confirmed=false`, no DID/Hedera account) — no DID provisioning/import performed.

## Layout

```
ACM0010/
├── ACM0010.policy                                              generated artifact (31,805 bytes)
├── build-policy.mjs                                           zero-dependency builder
├── policy.config.json                                         block tree
├── logic/
│   ├── calculate-baseline-ch4.js                              BE_CH4,y
│   └── project-hub-project-description-custom.js              Project Hub CUSTOM mapping
├── schemas/
│   ├── project-description.schema.json
│   └── baseline-emission-reduction-calculation.schema.json
└── test/
    ├── _artifact.mjs                                          ZIP reader + vm sandbox
    ├── load-artifact.test.mjs
    ├── calculate-baseline-ch4.test.mjs
    └── project-hub-mapping.test.mjs
```

## Build and test

```sh
node build-policy.mjs
node --test "test/*.test.mjs"
```

Both use only the Node standard library. No dependency was added and no
workspace `package.json` was modified.

## Roles

- **Project Proponent** — defines the project, submits the project description
  and monitoring data.
- **VVB** — independent validation and verification body.

## Key references

| Used for | Path |
|---|---|
| `.policy` container layout, `customLogicBlock` style, role/workflow doc skeleton | `Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/` |
| **Project Hub CUSTOM mapping** (`vcs` / `ccb` / `sdVista`), systemSchemas | `Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy` |
| Minimal container shape | `Methodology Library/Tutorials/001-hello-world/Hello World.policy` |
| Guardian block semantics | `Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0047/` |

VM0033 is the strongest precedent for the transformation work: across the 152
`.policy` files in this repository `dataTransformationAddon` appears only in
VM0033 (twice) and `httpRequestBlock` only once, in an unrelated policy. VM0033
is also the only policy that already carries `vcs`, `ccb` and `sdVista`.

## ASSUMPTIONS

Each item is unconfirmed upstream and is labelled deliberately. None is a
claimed requirement.

1. **Version.** Built against **ACM0010 v9.0** (UNFCCC MP98 draft header
   "Version 09.0") plus the Clarifications dated 2024-07-05. Issue #5945 leaves
   v8-vs-v9 unanswered.
2. **Sectoral scope.** `projectType: '15'`. Verra lists ACM0010 under "15.
   Livestock and manure management". VM0033 uses `'14'`.
3. **CH4 density.** `D_CH4 = 0.00067 t/m3` (0.67 kg CH4/m3) at 20 ºC and
   1 atm, quoted verbatim from ACM0010 parameter `DCH4` (v02 MP24, v03 EB35,
   v08-draft MP59). This is the **single** CH4 density for the whole policy;
   the baseline-methane expression in kg/m3 is derived from it so the two
   cannot drift apart. An earlier revision inconsistently used 0.716 kg/m3
   (0 ºC) in `BE_CH4,y`; that defect was corrected.
4. **GWP of CH4.** Exposed as an input parameter, defaulted to `28` in test
   fixtures only. The correct value depends on the AR/GWP set that Verra's VCS
   v5.0 standard mandates. **Must be confirmed.**
5. **B0 and VSLT.** Test fixtures use illustrative values (Dairy Cattle
   `VS = 68 kg VS/yr`, `B0 = 0.24 m3/kg VS`; Swine `VS = 53`, `B0 = 0.25`).
   Real values are country- and system-specific and belong in the IPCC 2019
   Refinement tables. **No IPCC default should be treated as authoritative here.**
6. **Template baseline.** Modelled structurally on the published VCS v5.0 DOC
   templates. Verra has not released the v5 *digital* templates and has not
   digitalised ACM0010.
7. **Folder naming.** New `ACM0010/` folder. The pre-existing empty
   `ACM0010 V3.0/` placeholder was left untouched; its name is stale relative to
   v9.0 and renaming it is a maintainer decision.
8. **Placeholder identities.** `topicId`, `creator`, `owner` are inert
   development values. No live Hedera account, topic or token is referenced.
9. **systemSchemas.** Copied verbatim from `VM0033.policy`. Authoring them is
   out of slice scope.

## What remains for the full bounty

- `BE_N2O,y`; `PE_AD`, `PE_Aer`, `PE_N2O` (both options), `PE_elec/heat`,
  `PE_flare`, `PE_transport`; leakage from land application **and** digester;
  net `ER`.
- VSLT Options 2-4 and the `N_LT` option branches.
- The five referenced UNFCCC tools: TOOL02, anaerobic-digester emissions,
  electricity, fossil combustion, flaring methane.
- Monitoring Report direction of the Project Hub mapping.
- Full field coverage for VCS, joint VCS-CCB, CCB and SDVISta.
- Schema workbooks, the step-by-step guide, screenshots and demo video.
- Testnet deployment and end-to-end proof that data reaches Project Hub.
