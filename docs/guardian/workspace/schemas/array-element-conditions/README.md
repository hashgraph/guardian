---
tags:
  - concept
  - tag: new
    primary: true
---

# Array Element Conditions

An array element condition is a schema condition whose IF trigger is a field with **Allow multiple answers** enabled, matched against the field's individual entries rather than against the field's value as a whole.

#### The problem it solves

A regular condition compares a field's value to a single literal with `=`. When the trigger field allows multiple answers, its value is a list, and a list is never equal to a single literal — the condition can be created in the editor, but it can never match.

Array element conditions replace `=` with two comparators that make sense for a list, so the trigger field's individual entries — not the list as a whole — decide whether the condition matches.

#### How it works

When the selected IF field has **Allow multiple answers** enabled, the condition editor offers two comparators instead of `=`:

* **contains** — true when any entry in the list equals the match value.
* **= (each)** — true when every entry in the list equals the match value. An empty list never satisfies this.

For a field that does not allow multiple answers, the comparator is always `=`, exactly as it works today.

The comparator is evaluated the same way while the form is being filled in and when the document is submitted, so a field that appears because the condition matched in the form is never rejected on submission for a different reason.

#### Key distinctions

* **Not the same as cross-schema conditions.** A cross-schema condition lets the trigger and target live in different sub-schemas. An array element condition is about the values inside one field's own list, matched against a single literal — the trigger and target can be in the same schema or different ones, independently of which comparator is used.
* **Not the same as repeatable field links.** Repeatable field links pair entries across two fields that both allow multiple answers, so a condition inside one linked entry can trigger on a field inside the matching entry of another. An array element condition works within a single field's own list of values, with no pairing involved.
* **Only for fields with a plain value type.** A field whose entries are themselves sub-schemas is not eligible — array element conditions compare literal values (text, number, boolean), not sub-schema entries.

#### Related

* Task: [Configure an Array Element Condition](configure-array-element-conditions.md)
* Concept: [Cross-Schema Conditions](../cross-schema-conditions/)
* Concept: [Repeatable Field Links](../repeatable-field-links/)
* Reference: [Conditional and Visibility Logic](../best-practices-to-implement-schema/conditional-and-visibility-logic.md)
