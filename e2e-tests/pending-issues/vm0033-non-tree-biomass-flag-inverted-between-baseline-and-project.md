# VM0033: `is_aboveground_non_tree_biomass` has opposite effects in the baseline and in the project scenario

**Status:** open, content of the VM0033 policy (methodology calculation); to be confirmed against the VM0033 methodology by its maintainers
**Component:** the custom-logic script of `calculate_project_fields` and `calculate_report_fields` in `Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy`; the e2e fixture `e2e-tests/cypress/fixtures/VM0033_7_23.policy` has the same script
**Severity:** to be assessed. If one of the two branches is wrong, the shrub and herbaceous carbon terms are counted for the wrong strata, and that changes the computed emission reductions.
**Found while:** fixing the conditional output fields of the same script (`3a32dffd3`). That commit does not change this behavior: the same checks were in the script before it.

## What the script does

Per stratum, the baseline (`processBaselineEmissions`) zeroes the shrub and herbaceous terms when the flag is `true`:

```js
if (asl.is_aboveground_non_tree_biomass) {
    delta_CSHRUB_BSL_i_t_ar_tool_14 = 0;
    asl.delta_CSHRUB_BSL_i_t_ar_tool_14 = delta_CSHRUB_BSL_i_t_ar_tool_14;
}
asl.delta_C_BSL_tree_or_shrub_i_t = const_12_by_44 * (asl.delta_CTREE_BSL_i_t_ar_tool_14 + delta_CSHRUB_BSL_i_t_ar_tool_14);
if (asl.is_aboveground_non_tree_biomass) {
    asl.delta_C_BSL_herb_i_t = 0;
}
```

The project scenario (`processProjectEmissions`) zeroes them when the flag is **not** `true`:

```js
const delta_C_SHRUB_PROJ_i_t_ar_tool_14 = asl.is_aboveground_non_tree_biomass === true ? stratum.ar_tool_14.delta_C_SHRUB : 0;
...
asl.delta_C_WPS_tree_or_shrub_i_t = const_12_by_44 * (delta_C_TREE_PROJ_i_t_ar_tool_14 + delta_C_SHRUB_PROJ_i_t_ar_tool_14);
if (asl.is_aboveground_non_tree_biomass !== true) {
    asl.delta_C_WPS_herb_i_t = 0;
}
```

Both blocks of both archives contain these checks.

The output schemas allow `delta_CSHRUB_BSL_i_t_ar_tool_14` and `delta_C_SHRUB_PROJ_i_t_ar_tool_14` only when `is_aboveground_non_tree_biomass` is `true`. That matches the project branch's reading of the flag ("the non-tree biomass pool is included"), not the baseline's.

## How it was checked

The two functions were taken from the archive's script and run on one stratum with `ar_tool_14.delta_C_TREE = 10`, `ar_tool_14.delta_C_SHRUB = 5`, `is_aboveground_tree_biomass = true`, and an herbaceous term of 7 in both scenarios:

| `is_aboveground_non_tree_biomass` | baseline `tree_or_shrub` | baseline `herb` | project `tree_or_shrub` | project `herb` |
|---|---|---|---|---|
| `false` | 4.0909 (12/44 × 15, shrub counted) | 7 | 2.7273 (12/44 × 10, shrub not counted) | 0 |
| `true` | 2.7273 (shrub not counted) | 0 | 4.0909 (shrub counted) | 7 |

The same flag value counts the shrub and herbaceous terms in one scenario and drops them in the other.

## Test impact

None. `VM033.cy.js` sends `is_aboveground_non_tree_biomass: false` and asserts on the workflow, not on the computed values.

## What a fix needs

The VM0033 maintainers should decide which reading of the flag is the right one. Then align the other branch in both custom-logic blocks of the library archive (and of the e2e fixture), and say whether documents already issued with the current script need a correction.
