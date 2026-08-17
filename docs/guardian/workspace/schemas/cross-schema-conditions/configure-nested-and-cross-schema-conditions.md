---
tags:
  - tasks
---

# Configure Nested and Cross-Schema Conditions

Set up a condition where the trigger field, the controlled fields, or both live inside referenced sub-schemas.

### Prerequisites

* The schema you are editing already has at least one field of type **Sub-Schema** referencing a loaded sub-schema.
* For cross-schema conditions, you need at least two Sub-Schema fields referencing different sub-schemas.

### Steps

#### Use a nested field as the IF trigger <a href="#use-a-nested-field-as-the-if-trigger" id="use-a-nested-field-as-the-if-trigger"></a>

1. Open the schema editor and scroll down to the **Conditions** section.
2. Click **Add Condition**.
3. Open the IF field picker. Fields are grouped: **This Schema** at the top, then one group per referenced sub-schema labelled with the sub-schema's name.
4. Select a field from one of the sub-schema groups.
5. Enter the match value in the field to the right of the picker.
6. Add THEN and ELSE fields using **Add THEN Field** and **Add ELSE Field** as normal.
7. Save the schema.

#### Add cross-schema targets to a THEN or ELSE branch <a href="#add-cross-schema-targets-to-a-then-or-else-branch" id="add-cross-schema-targets-to-a-then-or-else-branch"></a>

Continue from step 5 above, or open an existing condition that already has a nested IF field set.

6. Below the THEN fields area, open the **Add sub-schema THEN field or Add sub-schema ELSE field** dropdown and select a field from a sub-schema. That field appears when the condition is true. It appears as a **Sub-schema THEN** chip on the condition row.
7. Repeat for any additional target fields across other sub-schemas.
8. Save the schema.

{% hint style="info" %}
Sub-schema THEN alone already hides the target field in the form when the condition does not match.
{% endhint %}

### Result

When a user fills in the parent form:

* The condition from the IF field is taken from the target sub-schema.
* When its value matches: **Sub-schema THEN** or **Sub-schema ELSE** target fields appears in form.
* When its value does not match: **Sub-schema THEN** or **Sub-schema ELSE** target fields are hidden and must not be submitted.

### Troubleshooting

**Sub-schema fields do not appear in the IF picker.**\
The sub-schema must be fully loaded in the editor. If a group is missing, check that the Sub-Schema field has a valid schema type assigned and that the referenced schema is available in your policy context.

### Related

* Concept: [Cross-Schema Conditions](./)
* Task: [Creating Schema using UI](../creating-system-schema-using-ui.md)
* Reference: [Conditional and Visibility Logic](../best-practices-to-implement-schema/conditional-and-visibility-logic.md)
