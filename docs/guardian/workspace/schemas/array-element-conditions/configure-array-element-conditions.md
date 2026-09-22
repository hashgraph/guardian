---
tags:
  - tasks
---

# Configure an Array Element Condition

Set a condition whose IF trigger is a field with **Allow multiple answers** enabled, using **contains** or **= (each)** to match against the field's individual entries instead of the field's value as a whole.

#### Prerequisites

* The schema you are editing has at least one field with **Allow multiple answers** enabled, using a plain value type (Text, Number, or similar — not Sub-Schema).

#### Steps

1. Open the schema editor and scroll down to the **Conditions** section.
2. Click **Add condition**.
3. Open the field picker under **When** (placeholder "Select field…") and select a field that has **Allow multiple answers** enabled.
4. In the comparator dropdown that appears next to the field picker, choose:
   * **contains** — matches if any entry in the field's list equals the value.
   * **= (each)** — matches if every entry in the field's list equals the value.
5. Enter the match value in the field to the right of the comparator.
6. Add **THEN**/**ELSE** fields with **New field** as normal.
7. Save the schema.

{% hint style="info" %}
If the selected field does not have **Allow multiple answers** enabled, the comparator dropdown is replaced with a plain `=`.
{% endhint %}

#### Result

When a user fills in the form:

* **contains**: the THEN/ELSE fields tied to this condition appear as soon as any one entry in the list matches the value.
* **= (each)**: the THEN/ELSE fields appear only once every entry in the list matches the value — an empty list never matches.

The same rule is enforced again when the document is submitted, so a field revealed in the form is never rejected for a different reason on submission.

#### Troubleshooting

**The comparator dropdown only shows `=`, not contains/each.**\
The selected IF field does not have **Allow multiple answers** enabled. Comparator choices only appear for fields that do.

**The condition doesn't match even though the value looks right in the list.**\
Matching is case-sensitive. Check that the entry and the match value match exactly, including capitalization.

#### Related

* Task: [Configure Nested and Cross-Schema Conditions](../cross-schema-conditions/configure-nested-and-cross-schema-conditions.md)
* Task: [Set up Repeatable Field Links](../repeatable-field-links/set-up-repeatable-field-links.md)
* Reference: [Conditional and Visibility Logic](../best-practices-to-implement-schema/conditional-and-visibility-logic.md)
