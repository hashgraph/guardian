# Bounty Q&A on tools: how VMR0015 v3.1 complies

The team's answers are quoted from the bounty Q&A sheet. "Evidence" points to the exact place in the policy or to a re-runnable check.

## Q1: Embed tool calculations in the calculation blocks; inputs from the template data/parameter sections; mathBlock, not customLogic

> *"for calculations that will tie into the ERR or net benefit calculation it can be embedded because the inputs need to come from the data/parameter sections in the Project Description templates and/or Monitoring Report templates. Please note the bounty submissions should be using the math block and not the custom logic block for calculations."*

| Requirement | Policy | Evidence |
|---|---|---|
| Tool formulas embedded in the calculation blocks | TOOL03, VT0010, TOOL30/TOOL33 and the CDM Sampling Standard are embedded in the two mathBlocks (`pp_err_calculation_pd_vcs_ex_ante`, `pp_err_calculation_mr_vcs_ex_post`) | Block tree; `tools/regression.py` |
| mathBlock, not customLogic | 2 mathBlocks hold every calculation. The 2 customLogicBlocks only reject an MR whose monitoring period overlaps an approved one; they calculate nothing. The mint amount uses the mint rule `min(ERverified, ERcalculated)`, which Guardian evaluates with mathjs (`PolicyUtils.aggregate`), so no customLogic is needed | `tools/wiring.py`; policy description |
| Inputs from the template data/parameter sections | **Partly met** (19 October review, F9). The TOOL03, VT0010 and SEC inputs are read directly from **Appendix 2** of the PD/MR (`appendix2.a21_1` SEC inputs, `a21_3` and `a22_3` VT0010, `a22_2` TOOL03). The declared formula variables link to the same Appendix 2 fields | mathBlock `expression.variables` (each `field` is an `appendix2.*.value` path) |
| No silent second source | Values kept per section or per fuel row (m, P_y, QPW_y, fuel factors, fNRB, Adj_LE) come from the methodology records. Where Appendix 2 states the same parameter as a "Single value", **the engine compares the two and flags any difference** (ER unchanged) | `tools/regression.py`: "Appendix 2 fNRB 0.70 vs records 0.62 → flagged" and "Appendix 2 m 0.90 vs 0.95 → flagged" |

## Q2: "#variable:schema" 500 error from tool blocks

> *"This error is due to the schema reference inside the tool blocks not matching the tool schemas you published."*

Not applicable: the policy has no tool blocks, so it cannot hit this import error.

## Q3: Tool calculations directly inside the PD or MR calculation blocks

> *"This is why we are creating tool calculations directly inside the PD or MR calculation blocks because all input references need to come from the templates."*

Done:
- **Ex-ante** (PD block): reads the PD's Appendix 2.
- **Ex-post** (MR block): reads the MR's Appendix 2. Validation-fixed values (SEC inputs, grid EF, Adj_LE) come from the registered PD through the document relationship.

## Q4: Digitise only the tool sections the methodology uses; additionality tools are easily reused

> *"you should only digitalize that section of the tool and add those formulas to your calculation blocks."*

| Tool | Sections digitised | Why these |
|---|---|---|
| CDM TOOL03 | Eq.(1)–(4): Option A (carbon fraction, mass or volume) and Option B (NCV × EF) | Project fossil fuel use (VMR0015 s8.2) |
| Verra VT0010 v1.1 | Eq.(5), (7)–(9) grid and captive/off-grid plant, Eq.(11) shared power plants, **Eq.(13)–(14) shared-plant emission factor with cogeneration** (p.12–13) | Project electricity (VMR0015 s8.2 replaces TOOL05) |
| CDM TOOL30 / TOOL33 | fNRB option 2 (TOOL30 × (1 − 0.26)) and option 3 (TOOL33 default) | VMR0015 s9.2 |
| CDM Sampling Standard v09.0 / Guideline v04.0 | Required n for proportions (para 13), minimum 30 (para 14), 90/10, para 18 discount in survey years 1–2 | AMS-III.AV tables 11–12 |
| AMS-I.E | Adj_LE (0.95 default or survey value) | VMR0015 s8.3, AMS-III.AV s5.4 |
| VT0008, TOOL21, TOOL19 | Additionality tool choice checked against the VMR0015 s7 limits (TOOL19 ≤ 20 kt, TOOL21 ≤ 60 kt CO2e/yr); VT0008 inputs recorded for the VVB | VMR0015 s7 |

VT0010 Eq.(13)–(14) were added in v3.1:
- The inputs (Q_n,f, NCV_f, EF_CO2,f, EG_n, HG_n, η_cogen,n) were already in Appendix 2, but v3 used a typed factor and never calculated it.
- They now exist both as declared LaTeX formulas (`eqHSPP`, `eqEFSPP`, `eqEFSPPused`) and in code.
- Both were checked with Guardian's own formula engine (`@cortex-js/compute-engine` 0.27): 0 parse errors, and the values match the hand calculation.

**Additionality reuse.** The Guardian repo ships CDM **Tool 19 and Tool 21 as `.tool` files**. There is no VT0008 tool, and VT0008 is VMR0015's general route. v3.1 offers TOOL19 and TOOL21 as selections and checks the s7 limits, but does not wire the `.tool` files in. Whether it should is listed as a team question.

## Q5: A policy with zero CDM tool blocks (asked about this policy)

No answer is recorded. The policy follows the Q1 and Q3 answers: no tool blocks, with tool formulas embedded in the PD and MR calculation blocks.

## Q6: MRs are annual; aggregate a year of data in the math block

> *"the user would be able to provide 12 months of data that can then be aggregated using logic in the math block"*

The MR engine aggregates in the math block:
- it sums any number of water-meter rows per section, and any number of sections;
- the period length comes from the period dates;
- the 5.5 L/person/day cap is pro-rated to that length.

Evidence: `tools/regression.py`, cases "half-year period" and "typed periodDays vs dates".

## Q7: Reference-project gaps

The team cannot diagnose these. The sample is hand-checked instead: `docs/FORM_FILLING_GUIDE.md` gives the full hand calculation.

## Q8: Use the tools the methodology references

> *"You would use the tools reference by the methodology."*

VMR0015 references:
- VT0010, VT0008
- TOOL03, TOOL19, TOOL21, TOOL30
- AMS-I.E
- the CDM Sampling Standard
- TOOL33, in s9.2

The policy uses only these. Two other tools appear in the text, but only as references:
- **TOOL05** appears only as "VT0010 v1.1, which replaces CDM TOOL05 for this methodology (VMR0015 s8.2)". Before the 19 October review the PD 4.2 / MR 5.2 equation text and the sample TDL source still cited TOOL05 v3.0; both were corrected (F11, F18).
- **VT0011** is cited because VT0010 points to it for the grid emission factor, which is entered as an input.
