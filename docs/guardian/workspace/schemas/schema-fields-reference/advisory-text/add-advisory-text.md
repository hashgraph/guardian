---
tags:
  - tasks
---

# Add Advisory Text to a Field

Add a hint to a schema field so the form shows it to the user. See [Advisory Text](README.md) for how it works.

#### Prerequisites

* The schema is open in the schema editor in **DRAFT** status.
* The schema has an input field you want to add a hint to.

#### Steps

**1. Select the field**

Click the field in the schema editor. Its settings open on the right.

**2. Turn on Advisory text**

Turn on the **Advisory text** switch. It is right after **Description**. A text box appears.

**3. Write the hint**

Enter the hint as plain text, for example *Use the same name as in the project registry*. To remove the hint, turn the switch off.

**4. Save the schema**

Click **Save all**.

**5. Use Excel (optional)**

When schemas are exported to Excel, each sheet has an **Advisory Text** column as its last column. You can write or change hints in this column and import the file back. An empty cell means no hint. Workbooks without this column import without hints.

#### Result

When the schema is used in a policy form, the hint is shown under the field label, above the input.

#### Related

* Concept: [Advisory Text](README.md)
