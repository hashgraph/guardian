# Running the Policy Integrity Test (do this before submitting)

Guardian 3.6 feature. Your instance runs 3.6.0, so it is available.

## What it does

You declare the **input documents** submitted to the policy and the **specific output
documents expected in return**. When the test runs, Guardian checks whether the declared
outputs match — passing if they do, failing with inspectable detail if they don't. The test
is saved as a **named baseline** and can be re-run at any time: before publishing a policy
edit, after a Guardian upgrade, or as a routine integrity check.

Why it matters here: it converts "the author says the math is right" into "the reviewer can
press a button and watch it pass."

## Steps

1. Open the policy in Guardian (dry run mode is fine).
2. Load the calibration Monitoring Report — `draft_MR_TEST_CLEAN_final.json` — through
   **Add Report → Restore from draft file**.
   - If prompted *"The draft was created for a different schema/policy/form"*, click
     **Continue**. Guardian reassigns IDs on every import; the field values still load.
   - After loading, confirm `field31 = 0.65` and `field58 = 4.11` before submitting.
3. Submit and let the workflow run through to mint.
4. Confirm the computed outputs:

   | Field | Expected |
   |---|---|
   | field3 (BE_y) | 1,858,686.05 |
   | field4 (PE_y) | 0 |
   | field5 (LE_y) | 547.44 |
   | field6 (ER_y) | **1,858,138.61** |
   | Minted | 1,858,138 VCU (floored, 0 decimals) |

5. Open the **Policy Integrity Tests** dialog for this policy.
6. Create a new test:
   - **Input:** the Monitoring Report document you just submitted.
   - **Expected output:** the Monitoring Report VC with the computed fields above, and the
     mint VC (`MintToken`, amount 1858138.61).
   - **Name:** something a reviewer will understand, e.g.
     `VMR0015 ER calculation baseline - calibration dataset`
7. Save the baseline, then **re-run it once** to confirm it passes on a clean run.
8. Record the test name and result, and fill them into the two blanks in the PR description
   under **Testing → Policy Integrity Test**.

## Edge cases worth testing too

These are the ones a reviewer is most likely to probe. Each should be a separate test or at
least a manual check:

| Test | Change | Expected result |
|---|---|---|
| REDD+ gate holds | `field19 = false` | Mint does **not** fire |
| Water-quality gate holds | `field10 = 100`, `field11 = 115` (87% pass) | `field6 = 0`, no mint |
| QPW method 1 | `field54 = 1`, fill `field55`/`field56` | QPW = capacity × usage time |
| QPW method 0 | `field54 = 0`, fill `field36`–`field41` | QPW = sum of instances |

If any of these behaves differently from the table, send me the resulting VC and I'll trace it.
