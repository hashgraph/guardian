---
tags:
  - new
---

# Policy Integrity Tests

Policy Integrity Tests are an end-to-end (e2e) testing capability that lets policy authors define expected inputs and outputs for a policy and verify automatically whether the policy produces them. A test passes when the declared outputs match. A test fails when they do not.

### The problem they solve

Policies change. Guardian upgrades. Methodologies get refined. Each of these events can silently alter how a policy behaves — producing different document outputs, triggering unexpected workflow paths, or failing to issue tokens under conditions that previously worked. Without a way to verify expected behavior, errors surface in production and affect real project data and real environmental asset issuance.

Policy Integrity Tests give registry operators and policy authors a repeatable, automated way to confirm that a policy still behaves as intended after any change — to the policy itself, to Guardian, or to the underlying system.

### How they work

An author defines a test by specifying two things: the input documents the policy should receive, and the output documents the policy should produce. Guardian runs the policy against those inputs and evaluates whether the outputs match the author's declaration. The result is a simple pass or fail.

Tests are accessible from both the UI and the API, and can be re-run at any point in the policy lifecycle.

### Key distinctions

Guardian already supports automated end-to-end comparison through its record-and-replay capability, which captures an entire workflow execution and replays it to detect any divergence. That approach performs a technical comparison of the full execution — including UUIDs and other system-level metadata that policy authors do not own or control.

Policy Integrity Tests build upon this functionality and instead of comparing entire workflow executions, they let authors declare scope: which documents are the input, and which specific output documents need to match. The test passes when the declared outputs match, regardless of surrounding workflow differences outside that declared scope. This makes tests stable across policy edits and Guardian version upgrades — they only fail when the logic the author actually cares about changes.

### When to use them

Tests are most valuable at two points in the policy lifecycle.

**During authoring and iteration** — before publishing, tests confirm that the policy logic matches the methodology specification. In complex multi-role workflows, a misconfigured block can produce incorrect output without any visible error. Tests surface that before it reaches production.

**After changes** — when a policy is updated or Guardian is upgraded to a new version, re-running the policy integrity tests confirms that the behavior authors care about is preserved. This is regression testing for policy logic and verificable credential document outputs.

### Who creates them

Policy Integrity Tests are created and managed by Standard Registry operators and policy authors — the roles responsible for the correctness of the policy. Tests are part of the policy authoring and governance workflow, not end-user functionality.

### Related

* [Task: Create a Policy Integrity Test](create-a-policy-integrity-test.md)

