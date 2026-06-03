> **Note on `.policy` export vs. repository:** The `VMR0015.policy` binary
> export does **not** bundle the `tests/`, `formulas/`, `tools/`, or `tokens/`
> directories — Guardian's export format includes only `policy.json`,
> `schemas/`, `systemSchemas/`, `proof.json`, and the IPFS package. The
> `tests/` and `formulas/` directories *inside* the `.policy` ZIP are therefore
> empty by design. All test artifacts (`VMR0015_dryrun_record.record`,
> `VMR0015_dryrun_publish_proof.csv`, fixture JSON) and the readable formula
> JSON live only in this repository under `tests/` and `formulas/`. To verify
> the dry-run evidence or inspect the formulas, **clone the repository and
> inspect `tests/` and `formulas/` there** — do not expect them inside the
> imported `.policy` bundle.

- The dry-run record `tests/VMR0015_dryrun_record.record` was captured from this
  `VMR0015.policy` export with the `calculate_report_fields` block implementing
  the `pass_rate < 0.90` water-quality gate and the equations
  `SEC = 357.48 / nwb`, `BE_y = QPW_y * m * X_boil * SEC * (BL_fuel * f_i * EF_fuel * 1e-9)`,
  and `ER_y = BE_y - PE_y - LE_y`. Earlier 0.95-gate development builds were
  discarded; no evidence files in this repository were generated from them.

> Version note: The `policy.json` inside `VMR0015.policy` uses policy version
> `2.0.0` for this export. The `codeVersion` and `proof.json` entries show
> `1.5.1`, which is the Guardian engine/export format version, not a policy
> revision number. Submission-level changes (2.0.0, 2.1.0, 2.1.1) are tracked
> in `CHANGELOG.md`.
