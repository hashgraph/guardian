# The 181 validator warnings: what they are

Guardian's policy validator reported **0 errors and 179 warnings** for the first 19 October build. The current files add 2: the verification and VCU-request prechecks are now children of their request forms (see the table), so `tools/reach.py` gives **181**. Expect 181 from Guardian's validator; it has not yet been run on MGS for these files.

The warnings come from two sources in Guardian's code (`interfaces/src/validators/policy-messages`):
1. **Deprecated blocks or properties.** Guardian's deprecation registry is currently **empty**, so none of the warnings come from here.
2. **Reachability notes.** These are raised for a block with no inbound or outbound event link. The text of each note says *"not all blocks necessarily require their presence."*

`tools/reach.py` re-implements Guardian's reachability rule (`computeReachability`, with the default-event list taken from the block definitions). It gave **179** for the first 19 October build, the same count Guardian reported, **181** for the current files, and **210 for VM0047**.

| Block type | Kind of note | v3.1 | VM0047 | Why it is expected |
|---|---|---|---|---|
| documentsSourceAddon | isolated | 44 | 49 | Data sources for grids and for the two overlap checks; they never have events |
| interfaceContainerBlock | isolated / no-out | 29 | 30 | Page and tab containers |
| buttonBlockAddon | isolated | 18 | 18 | Buttons are wired through the parent grid's events (`output` = button tag), which this rule does not count |
| reportItemBlock | isolated | 18 | 14 | Trust-chain report items |
| sendToGuardianBlock | no-out | 15 | 10 | Final saves (reject, terminal status) |
| historyAddon | isolated | 14 | 17 | Status history on grids |
| interfaceDocumentsSourceBlock | isolated / no-in | 21 | 22 | Grids |
| requestVcDocumentBlock | no-in | 5 | 5 | Entry forms (where a user starts) |
| documentValidatorBlock | isolated | 2 | 0 | `pp_vcu_request_precheck` and `vb_verification_precheck` are children of their request forms. Guardian runs a request block's child validators before it saves anything or fires any event, so they need no event links |
| informationBlock, interfaceActionBlock, interfaceStepBlock, policyRolesBlock, reportBlock, filtersAddon, mintDocumentBlock (VM0047 also includes 24 transformation/HTTP add-ons for the Verra Project Hub) | various | 15 | 45 | UI and terminal blocks |
| **Total** | | **181** | **210** | |

`tools/wiring.py` checks the links that matter:
- every event source and target exists;
- every button is wired;
- every navigation entry points to an existing block;
- block IDs and tags are unique.

Result for v3.1: **0 problems**. VM0047 has 1 broken event target (`pp_calculation_ex`); v3.1 does not inherit it.
