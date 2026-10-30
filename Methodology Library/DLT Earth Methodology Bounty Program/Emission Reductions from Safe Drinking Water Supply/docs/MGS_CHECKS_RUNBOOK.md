# MGS checks runbook: the steps still to prove on Managed Guardian Service

**For:** anyone running the checks, step by step, with no prior Guardian knowledge. Part A is clicks in the MGS website. Part B gives the same steps as API calls, for scripted runs.

**What is already proven on MGS (20 Oct):**
- Both files ran the full path: ex-post 1,556.947181413, mint 1,556, an overlapping MR rejected, an adjacent MR accepted.
- The policies used: v5.0A `6ad7522372c7fd6f740082dd`, v5.0B `6ad752ef72c7fd6f74009492`.

**What the first run of this runbook showed (20 Oct, policy `6ad752ef…`, old files)**
- Checks 2, 3 and 4 refused correctly.
- Check 5 stopped at 5.7: the 2028 ERR vanished from the lists after its verification. This is fixed in the current files (README item 38), so **re-import the current files** before running check 5 again.
- Check 1 found no Ex Ante ERR. That is still open; run **D1–D2** below.
- **Checks that run after the form is saved** (`pp_project_id_unique`, the overlap checks, the registration check, the re-open and issue guards) stop the action. Through the API, however, the call still returns HTTP 200 without the message. In the website, Guardian shows the message as an error notice. Judge these checks by the result: nothing saved, status unchanged. **Checks inside a form** (VVB profile check, verification and VCU-request prechecks) return their message in the HTTP response.
- **The integrity test failed with "Block (vb_pd_approve_button) not available".** The recording started in the middle of a run, so its users and documents didn't exist when the test runner replayed it in a fresh dry-run. A test must be recorded from a fresh dry-run (A.8).

**Round 4 (21 Oct): every check passed.** Ex Ante ERR 1,666.620262475 on both files; integrity tests 100 % (13 of 13 documents) on both; re-open, second issuance (total 3,112), both refusals after issuance, the race and the wrong VVB ID all behaved as designed. See `MGS_ROUND4_RESULTS.md`.
- **Reading the wrong-VVB-ID message.** Guardian prints `got "VVB-EWV-001", expected "VVB-NOT-MINE"`. In a check against another document, Guardian's "got" is that document's value (the approved VVB profile) and "expected" is the value typed in the form (`documentValidatorBlock`, 3.7.1-rc). The refusal is correct; only the wording reads backwards. The message comes from `vb_validation_precheck`, the only check attached to the validation form.

**Third MGS round (21 Oct)**
- D1 confirmed that no Ex Ante ERR exists. The cause was found offline and fixed (README item 40): the new checks passed their document on as a one-item array, so the switch after the PD save matched no branch.
- D2/D4 ("JSON Object is empty") and D3 (timeouts) didn't reach the blocks, so that endpoint is not a usable diagnostic on MGS.
- **Next:** re-import the current files.
  - After the PD step, an **Ex Ante** row must appear in **Emission reductions (ERR)** with **1666.620262** and no flags.
  - Then record the clean runs and create the integrity tests. Expected: 100 %.

**Second MGS round (20 Oct evening)**
- Clean full runs on A and B minted 1,556 each.
- Both integrity tests replayed every step but scored 99 %. The cause was the `pdRef` / `mrRef` id copies, now removed (README item 39).
- B's issuance race is fixed in the same build.
- **Next round, on the current files:**
  1. Re-import both files.
  2. Record a clean run from a fresh dry-run and create the integrity test. **Expected: 100 %.**
  3. Run D1–D3 below for the missing Ex Ante ERR.
  4. Re-run check 5 (re-open after a rejected verification, which is fixed).

**Hand check of the ex-post result (sample, section S1)**

BE = QPW × m × X_boil × SEC × BL_fuel × (EF_CO2 × fNRB + EF_nonCO2) × 10⁻⁹ × Adj_LE. That is VMR0015 Eq.(1), with SEC = 357.48 / η_wb (AMS-III.AV Eq.(5)).

For S1:

3,960,000 × 0.93 × 0.88 × 2,383.2 × 0.85 × (112 × 0.62 + 9.46) × 10⁻⁹ × 0.95 = **492.085798 t**

The engine gives 492.08579792. Leaving out one factor moves the result by about 5–15 %:

| Factor left out | S1 result | Change |
|---|---|---|
| X_boil (0.88) | 559.19 | +13.6 % |
| non-CO2 term (9.46) | 433.09 | −12.0 % |
| Adj_LE (0.95) | 517.99 | +5.3 % |
| BL_fuel (0.85) | 578.92 | +17.6 % |

The four sections give BE = 1,558.271693. PE is 1.324512, deducted in proportion to each section's BE. ER = **1,556.947181**, and the mint is floor(min(ERverified, ERcalculated)) = **1,556**.

**What this runbook proves:**

| Check | What it proves |
|---|---|
| 1 | The ex-ante result |
| 2 | A project ID can't be used twice |
| 3 | A PD can't be registered before its validation report is approved |
| 4 | An issued ERR can't be re-opened |
| 5 | The re-open and issuance guards, end to end |
| 6–7 | Recordings and the Policy Integrity Test |

Checks 1–4 take about 30 minutes. Check 5 takes about 45 minutes.

**Files used (all in the package):**

| File | Used in |
|---|---|
| `sample-data/v5.0B/1_PP_account.json` | Check 2 (second project proponent) |
| `sample-data/v5.0B/3_Project_Description.json` | Check 2 (same project ID, must be refused) |
| `sample-data/v5.0B/mgs_checks/3_Project_Description_second_project.json` | Check 3 (project ID `PD-KSW-2027-002`) |
| `sample-data/v5.0B/mgs_checks/4_Monitoring_Report_2028.json` | Check 5, only if `MR-2028-001` doesn't exist yet |
| `sample-data/v5.0B/mgs_checks/6_Verification_Report_2028_a_to_reject.json` | Check 5 (`VER-2028-001`, to be rejected) |
| `sample-data/v5.0B/mgs_checks/6_Verification_Report_2028_b_to_approve.json` | Check 5 (`VER-2028-001b`, ER verified 1,600) |
| `sample-data/v5.0B/7_VCU_Issuance_Request.json` | Check 5 (VCU request) |
| `tools/draft_builder.html` | Makes any sample loadable on your instance (A.0) |

The extra samples validate against the v5.0B schemas. The only missing fields are the preset ones Guardian fills from the row you open the form on.

---

## Part A: in the MGS website

### A.0 Basics, read once

- **Where:** log in to MGS as the Standard Registry. Go to **Manage Policies** and find **VMR0015 Safe Drinking Water dMRV (VCS v5.0B)**, the one with status *Dry Run*. Click **Open**.
- **Switching users:** at the top of the dry-run page is the list of virtual users.
  - **Administrator** is the Standard Registry.
  - **Create User** adds a new virtual user.
  - Clicking a user name makes you act as that user.
- **Golden rule:** a new user first picks a role on the **Choose Role** screen. The Administrator never picks a role. If a page says "Block Unavailable", you're acting as the wrong user.
- **Loading a sample into a form:**
  1. Open the form and click **Save draft** without filling anything.
  2. Open `tools/draft_builder.html` in your browser.
  3. Choose that blank draft and the sample file, then download the result.
  4. In the form, click **Load draft** and pick the downloaded file. Then **Submit** (or **Create**).
- **Never** click **Fill with test data**. It puts 1 into every number field.
- **Write down everything you see:** each message (copy the exact text), and each status before and after. Take a screenshot of every refusal.

### A.1 Start recording

1. On the dry-run page, click **Record** (top right). A red recording marker appears.
2. Do everything below without leaving the policy. If you have to stop for the day, stop the recording first (A.7).

### A.2 Check 1: ex-ante result (nothing is changed)

If no Ex Ante row exists, don't stop. Do D1 and D2 in Part B and send me the output; they show whether the ex-ante ERR was created and hidden, or not created at all.


1. Act as **Administrator**.
2. In the left menu, click **Emission reductions (ERR)**.
3. Find the row with type **Ex Ante** and project **PD-KSW-2027-001**.
4. Click **View Document** on that row.
5. Read these two values:
   - `ex_ante.maxAnnualER` must be **1666.620262475**
   - `dataQualityFlags` must be empty or missing
6. Screenshot the document.

### A.3 Check 2: the same project ID by another project proponent (must be refused)

1. Click **Create User**. Name it `PP2` if a name is asked.
2. Act as **PP2**. On **Choose Role**, choose **Project Proponent** and confirm.
3. The account form opens. Load `1_PP_account.json` (A.0) and **Submit**. Status: "Waiting for approval".
4. Act as **Administrator**. Left menu → **Project proponent accounts**. On PP2's row, click **Approve**.
5. Act as **PP2**. Left menu → **Project descriptions** → **Create**.
6. Load `sample-data/v5.0B/3_Project_Description.json` **unchanged**. Its project ID is `PD-KSW-2027-001`, which already exists. Click **Submit**.
7. **Expected:** an error that says *"Project ID PD-KSW-2027-001 is already used by another project description in this policy … use a unique project ID"*.
8. Screenshot it, and close the form.
9. Act as **Administrator**. Left menu → **Project descriptions**. There must still be **only one** row with `PD-KSW-2027-001`.

### A.4 Check 3: register a project before its validation report is approved (must be refused)

1. Act as **PP2**. Left menu → **Project descriptions** → **Create**.
2. Load `sample-data/v5.0B/mgs_checks/3_Project_Description_second_project.json` (project ID `PD-KSW-2027-002`) and **Submit**.
3. **Expected:** accepted. The new row shows "Waiting for Approval". It's a different project ID, so the check from step A.3 doesn't apply.
4. The registry's **Approve** (Register) button only appears once the VVB has approved the PD. So first:
   - act as **PP2** → **Project descriptions** → on the `PD-KSW-2027-002` row, **Assign** it to the VVB
   - act as the **VVB** → **Project descriptions** → **Approve** that row
   - then act as **Administrator** → left menu → **Project descriptions** → on the `PD-KSW-2027-002` row, in the **Operations** column, click **Approve**.
5. **Expected:** an error saying the check `admin_pp_pd_register_check` failed. The text says, roughly, *"no Validation Report matches option.status equal "Registry approved", projectRef equal "PD-KSW-2027-002""*. In plain words: no approved validation report exists for this project yet.
6. Screenshot it.
7. The `PD-KSW-2027-002` row must still say **"Waiting for Approval"**, not "Registered".

### A.5 Check 4: re-open an ERR that was already issued (must be refused)

1. Act as **Administrator**. Left menu → **Emission reductions (ERR)**.
2. Find the **Ex Post** row for **MR-2027-001**. It's the one that was issued, 1,556 VCU.
3. In the **Operations** column of that row, click **Re-open for verification**.
4. **Expected:** an error. Its text says, roughly, *"no VVB Verification Report matches option.status equal "Registry rejected", monitoringReportRef equal "MR-2027-001" …"*. In plain words: re-opening is allowed only after a verification was rejected, and this one was approved.
5. Screenshot it.
6. The row's status must stay **"Verification submitted"**.
7. The project proponent's tokens must still be **1,556**. To see them: act as the first project proponent → **Tokens**.

### A.6 Check 5: re-open after a rejected verification, then the guards after issuance

This is the only check that runs the two new guard blocks on real Guardian. It uses the 2028 report.

1. **Is the 2028 MR there?**
   - Act as **Administrator** → **Monitoring reports**. Look for **MR-2028-001**.
   - If it's missing: act as the **first** project proponent → **Project descriptions** → the registered `PD-KSW-2027-001` row → **Monitoring report** column. Load `mgs_checks/4_Monitoring_Report_2028.json` and Submit.
   - Then, on **Monitoring reports**, **Assign** it to the VVB.
   - On **Emission reductions (ERR)**, **Assign** the new 2028 *Ex Post* row to the VVB.
2. **Check the 2028 ERR:** act as **Administrator** → **Emission reductions (ERR)**. The 2028 *Ex Post* row must show **1556.947181**, with no flags.
3. **VVB approves the 2028 MR:** act as the **VVB** → **Monitoring reports** → **Approve** on MR-2028-001.
4. **Registry approves the 2028 MR:** act as **Administrator** → **Monitoring reports** → **Approve** on MR-2028-001.
5. **First verification report:** act as the **VVB** → **Emission reductions (ERR)** → the 2028 *Ex Post* row → **Verification Report** column.
   - Load `mgs_checks/6_Verification_Report_2028_a_to_reject.json` → **Submit**.
   - Then **Verification reports** → **Assign** it to the project proponent.
6. **Registry rejects it:** act as **Administrator** → **Verification reports** → on `VER-2028-001`, click **Reject**. Reason: `test: rejected to check re-open`.
   - **Expected:** status "Registry rejected".
7. **Re-open, which must now be allowed:** act as **Administrator** → **Emission reductions (ERR)** → the 2028 *Ex Post* row → **Re-open for verification** (Operations column).
   - **Expected:** accepted. The status goes back to **"Calculated"**.
8. **Second verification report:** act as the **VVB** → **Emission reductions (ERR)** → the 2028 row → **Verification Report**.
   - Load `mgs_checks/6_Verification_Report_2028_b_to_approve.json`. It carries `VER-2028-001b` and **ER verified 1,600**. Submit.
   - Then **Assign** it to the project proponent.
9. **Registry approves it:** act as **Administrator** → **Verification reports** → **Approve** on `VER-2028-001b`.
10. **Request VCUs:** act as the **first** project proponent → **Verification reports** → `VER-2028-001b` row → **Request VCU issuance**. Load `7_VCU_Issuance_Request.json` → Submit.
    - **Expected:** the request shows under **VCU requests** as "Waiting for issuance".
11. **Issue:** act as **Administrator** → **Issue VCUs** → **Issue VCUs** on that request.
    - **Expected:** **1,556** minted, not 1,600, because the policy mints the lower of verified and calculated.
    - The project proponent's total is now **3,112**.
12. **Re-open again, which must be refused by the new guard:** act as **Administrator** → **Emission reductions (ERR)** → the 2028 row → **Re-open for verification** (Operations column).
    - **Expected:** an error that starts *"Cannot re-open: verification report VER-2028-001b for monitoring report MR-2028-001 is VCU requested …"*.
    - Screenshot it.
13. The total must still be **3,112**.

### A.7 Stop and save the recordings

1. Click **Stop** (top right, where Record was). Guardian downloads or offers a `.record` file. Save it as `VMR0015_v5.0B_checks.record`.
2. Also download the recordings of the two full runs from earlier today, if you can. Name them:
   - `VMR0015_v5.0A_full_run.record` (policy `6ad7522372c7fd6f740082dd`)
   - `VMR0015_v5.0B_full_run.record` (policy `6ad752ef72c7fd6f74009492`)

### A.8 Policy Integrity Test (record from a fresh start)

A test replays the whole recording in a new, empty dry-run. So the recording must start from an empty dry-run and contain everything: user creation, roles, profiles and documents.
1. **Manage Policies** → the policy → **Restart** the dry-run. This clears all virtual users and documents.
2. Click **Record**.
3. Do the full run of `docs/FORM_FILLING_GUIDE.md` steps 1–15, starting with **Create User** for the PP and the VVB.
4. Click **Stop** and save the file as `VMR0015_v5.0B_full_run.record`.
5. Then continue with steps 1–6 below.

The older steps follow:


1. Go back to **Manage Policies**.
2. On the v5.0B policy row, open the menu (⋮) → **Test Details**.
3. Click **Add test** (or **Upload**) and choose `VMR0015_v5.0B_full_run.record`.
4. Click **Run** on that test's row and wait.
5. **Pass:** keep the test. Write down that it passed, and screenshot the result.
6. **Fail:** open the result and note the step number, block tag and message.
   - If it fails when the VVB approves the PD, with "Document is not found", it's the known MGS test-runner limit. **Delete the test from the policy** and send the `.record` file separately as evidence.
   - Any other failure: send me the details before doing anything else.

### A.9 What to send back

Fill this table and send it with the screenshots and the `.record` files:

| Check | What you clicked | Message shown (exact) | Status before → after | VCU total | Pass/fail |
|---|---|---|---|---|---|
| 1 Ex-ante | | | | | |
| 2 Same project ID | | | | | |
| 3 Register before validation | | | | | |
| 4 Re-open issued ERR | | | | | |
| 5.7 Re-open after rejection | | | | | |
| 5.11 Second issuance (1,600 typed) | | | | | |
| 5.12 Re-open after issuance | | | | | |
| 8 Integrity test | | | | | |

---

## Part B: the same steps as API calls (for scripted runs)

Base: `https://<MGS host>/api/v1`. `{P}` = `6ad752ef72c7fd6f74009492`. Every call carries the Standard Registry's bearer token.

| Action | Call |
|---|---|
| List virtual users | `GET /policies/{P}/dry-run/users` |
| New virtual user | `POST /policies/{P}/dry-run/user` (the response has the DID) |
| Act as a user | `POST /policies/{P}/dry-run/login` with `{"did": "<DID>"}`. Use the Administrator's DID to act as the Standard Registry |
| Choose a role | `POST /policies/{P}/tag/Choose%20Role/blocks` with `{"role": "Project Proponent"}` or `{"role": "VVB"}` |
| Submit a form | `POST /policies/{P}/tag/<formTag>/blocks` with `{"document": <the sample's "document" object>, "ref": <row document, for forms opened from a row; else null>}` |
| Click a grid button | `POST /policies/{P}/tag/<buttonTag>/blocks` with `{"documentId": "<that row's document id>"}`. Reject buttons add `"dialogResult": "<reason>"` |
| Read a grid | `GET /policies/{P}/tag/<gridTag>/blocks` |
| Recording | `POST /record/{P}/recording/start`, then `POST /record/{P}/recording/stop` (the response body is the `.record` file). Status: `GET /record/{P}/status` |
| Tests | Upload `POST /policies/{P}/test/`, start `POST /policies/{P}/test/{testId}/start`, read `GET /policies/{P}/test/{testId}` |

**Diagnostics for the missing Ex Ante ERR** (run these and send the full output):
- **D1. List the policy's documents.** `GET /policies/{P}/documents?includeDocument=true` (page through all). For every document whose schema is the ERR schema ("VMR0015 Emission Reductions (ERR)"), report: `credentialSubject[0].ghgType`, `projectId`, `option.status`, `edited`, `createDate`.
- **D2. Run the PD calculation block on its own.**
  1. `GET /policies/{P}` and take the block with tag `pp_err_calculation_pd_vcs_ex_ante` from `config`.
  2. `POST /policies/{P}/dry-run/block` with body `{"block": <that block>, "data": {"input": "RunEvent", "output": "RunEvent", "type": "json", "document": <the full VC document of PD-KSW-2027-002 from D1, i.e. its "document" field>}}`.
  3. Report the whole response: logs, errors, input, output.
- **D3.** Repeat D2 with `pp_ex_post_ante_switch`.

Tags for each check:

| Check | User | Tag(s) | Expected |
|---|---|---|---|
| 1 | Administrator | grid `admin_emission_reduction_removal_grid`, Ex Ante row | `ex_ante.maxAnnualER` = 1666.620262475, no flags |
| 2 | new PP2 | `Choose Role` → `pp_create_account_form` (`1_PP_account.json`); Administrator `admin_pp_account_approve_button`; PP2 `pp_project_description_form` (`3_Project_Description.json`) | Error from `pp_project_id_unique`: "Project ID PD-KSW-2027-001 is already used …"; still one PD-KSW-2027-001 in `admin_pp_pd_grid` |
| 3 | PP2, then Administrator | `pp_project_description_form` (`mgs_checks/3_Project_Description_second_project.json`); then `admin_pp_pd_approve_button` on that row | Error from `admin_pp_pd_register_check`; the row stays "Waiting for Approval" |
| 4 | Administrator | `admin_err_reopen_button` on the MR-2027-001 Ex Post ERR | Error from `admin_err_reopen_validator` ("no VVB Verification Report matches … Registry rejected …"); status unchanged |
| 5 | as in A.6 | `admin_pp_mr_approve_button`, `vb_mr_approve_button`, `vb_verification_report_form`, `vb_verification_report_assign`, `admin_vb_verification_report_reject_button`, `admin_err_reopen_button`, `admin_vb_verification_report_approve_button`, `pp_vcu_request_form`, `admin_err_issue_button` | 5.7 accepted ("Calculated"); 5.11 mint 1,556, total 3,112; 5.12 error from `admin_err_reopen_guard`: "Cannot re-open: verification report VER-2028-001b …" |

Before using a tag in check 5, confirm it with `GET /policies/{P}/tag-block-map`. The grid and button tags in that row follow the names used in the policy. If one differs, use the tag shown for that button in the map.
