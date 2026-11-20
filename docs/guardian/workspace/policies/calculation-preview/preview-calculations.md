---
tags:
  - tasks
---

# Preview Calculations Before Submitting

Run a policy's calculations on the values you have entered and check the result before you submit the form. See [Calculation Preview](README.md) for how it works.

### Prerequisites

* You have a policy with a Request form whose chain contains calculation blocks, such as Custom Logic, Math or Calculate. The policy can be in Dry Run or published.
* You have a role in the policy that can open the form.

### Steps

#### Turn on Calculation Preview

1. Open the Request form.
2. Click **More actions** (`…`) in the top right corner of the form.
3. Turn on **Calculation preview**. The hint below it says *Run this policy's calculations without creating documents*.

The form now shows the banner *Calculation preview is on.* The banner also shows how many fields the calculations read, for example *Only the 6 fields the calculations read are required.* The submit button changes to **Preview**, and the steps at the top change to **Fill form** and **Calculation preview**. The banner has an **Exit calculation preview** button on its right side.

#### Fill in the required fields

1. Fill in the fields marked as required. The sidebar and section headers count only these fields.
2. If you choose a value in a list, add or remove a row or a section, or upload a file, Guardian checks the required fields again. The counters can change, because a different choice can lead the calculation down a different branch.

Typing in a text field does not start a new check. The required fields are checked again when you click **Preview**.

#### Run the preview

1. Click **Preview**.
2. If a value the calculation needs is still empty, a page opens with the heading *The calculations need N more values* Each empty field is marked **Missing**. Click **Go to field** next to a field, or **Fix first error**. Fill in the value and click **Preview** again.
3. When all needed values are filled in, the **Preview results** page opens. It says *Running calculation preview…* while the chain runs.

#### Check the results

1. Review the document list on the left. The **Input document** is first, followed by the documents the chain produced. The page opens the first **Final document**.
2. Intermediate documents are collapsed into a row with arrows, for example **1 intermediate document**. Click the row to show them.
3. Click a document to open it. Use the **Document** or **JSON** view to check the calculated values.
4. If an **Incomplete result** button is shown, click it to read the error messages from the chain. Click **Back to results** to return to the document list.

#### Change values or submit

* To change a value, click **Back to the form**. Your values are kept. Then click **Preview** again.
* To submit the form for real, click **Exit calculation preview** on the banner, or turn off **Calculation preview** in **More actions**. Then click **Validate & Create**. The form now checks all required fields, as usual.

### Result

You see the documents the policy would create from your values, with the final result marked. No documents, messages or tokens are created. When you submit the form with Preview off, Guardian runs the ordinary submission from the start.

### Troubleshooting

**Why does the number of required fields change?** The calculation took a different branch after you changed a choice. Only the fields of the current branch are required.

**Why did Preview ask for a field after I clicked Preview?** The field is used only in a branch that ran with your latest values. Text changes do not refresh the required fields until you click **Preview**.

**Why is no document marked final?** The chain stopped before it reached an end, for example because a block failed. Click **Incomplete result** to see why.

**Why does the submission fail after a successful Preview?** Preview checks only the fields the calculation reads. Ordinary submission checks the whole form. Fill in the remaining required fields.

**Why did an external service receive a request?** HTTP Request blocks send their requests during Preview, as on submission.

### Related

* Concept: [Calculation Preview](README.md)
