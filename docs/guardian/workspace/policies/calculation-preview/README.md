---
tags:
  - concept
  - tag: new
    primary: true
---

# Calculation Preview

Calculation Preview lets a user see what a policy will calculate before submitting a form. The policy runs its normal calculation chain on the values entered so far and shows the resulting documents. Nothing is saved, sent to Hedera or minted.

#### The problem it solves

A Request form often feeds a long calculation chain: Custom Logic, Math and Calculate blocks, Save blocks and token blocks. Without a preview, the only way to see the result is to submit the form. That creates a real document, and a mistake means starting again. The user also has to fill every required field, even the fields the calculation does not use.

For example, a project developer wants to know the expected emission reductions of a monitoring report before the report is complete. With Calculation Preview they fill in only the values the calculation reads, click **Preview**, and see the calculated total. If the number looks wrong, they change a value and run Preview again.

#### How it works

**Turn it on in the form.** Calculation Preview is a switch in the **More actions** menu of a Request form. It works in Dry Run and in published policies. The setting is remembered for each user, policy and form. It is off by default. While Preview is on, the banner above the form has an **Exit calculation preview** button that turns it off.

**Only the fields the calculation reads are required.** When Preview is on, Guardian checks which fields the calculation chain actually reads. Only those fields are required. The banner above the form shows how many there are, for example *Only the 6 fields the calculations read are required.* The sidebar and section counters show the same number. Fields that the form hides by its own conditions are never required.

**The required fields follow the user's choices.** A calculation can take different branches. For example, a script may use different fields depending on the project type chosen in the form. When the user picks a value in a list, adds or removes a row or a section, or uploads a file, Guardian checks the required fields again. Typing in a text field does not start a check. The check runs when the user clicks **Preview**.

**Missing values are listed before the calculation.** If a needed value is empty, a page opens with the heading *The calculations need N more values*. Each missing field is marked **Missing** and has a **Go to field** button. The user fills in the values and clicks **Preview** again. A zero or `false` counts as a filled value.

**The results show the whole document chain.** The **Preview results** page lists the documents in chain order. The input document comes first. Each document is marked as an **Input document**, an **Intermediate document** or a **Final document**. A final document is the last document saved in a branch that reached its end. The page opens the first final document. Intermediate documents are collapsed into a row with arrows, for example **1 intermediate document**, which can be expanded. Each document opens in the usual document viewer, with **Document** and **JSON** views.

**Incomplete results are shown, not hidden.** If a block in the chain stops with an error, the page still shows the documents created before the stop. An **Incomplete result** button opens the real error messages. The user can go **Back to the form** or click **Preview again**.

**Ordinary submission is not affected.** With Preview off, the form works as usual. **Validate & Create** always runs a new, ordinary submission. It does not reuse Preview results.

#### Key distinctions

* **Preview uses the same calculation as submission.** Given the same values, Preview and ordinary submission produce the same calculated values and take the same branches.
* **A successful Preview does not guarantee a valid submission.** Preview skips the checks of fields the calculation does not read. Ordinary submission still checks the whole form.
* **Preview leaves nothing behind.** It creates no documents, messages, tokens, notifications or files. Later blocks in the same Preview see the temporary documents of earlier blocks.
* **HTTP Request blocks send real requests.** An HTTP Request block in the chain calls its external service during Preview too, as it does on submission.
* **Files are not uploaded.** Table and GeoJSON files are read in the browser and are not uploaded during Preview.
* **Token balances are not tracked.** Preview does not change account balances after a mint or retirement.

#### Related

* Task: [Preview Calculations Before Submitting](preview-calculations.md)
