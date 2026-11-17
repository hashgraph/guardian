---
tags:
  - concept
  - tag: new
    primary: true
---

# Advisory Text

Advisory text is a short hint that a schema author adds to a field. The form shows it next to the field, so the person filling in the document knows what to enter.

#### The problem it solves

A field name and description do not always tell the user what value is expected. For example, a field *Project name* may need the exact name used in another registry. Without a hint, the author has to add a separate help text field or explain it outside the form.

Advisory text keeps the guidance on the field itself. The author writes it once in the schema, and every form that uses the schema shows it.

#### How it works

* The author turns on **Advisory text** in the field settings of the schema editor and writes the hint. It is optional.
* In the form, the hint appears as small text under the field label, above the input. It is always visible.
* For a field with **Allow multiple answers**, the hint is shown once, under the field label, not at each input of the list.
* The hint belongs to the schema. It is saved and published with the schema, and documents created from the form do not contain it.
* Advisory text is also available in Excel, in an optional **Advisory Text** column.

#### Key distinctions

* **Advisory text is guidance, not a value.** It does not change validation or what is saved in the document.
* **Most input fields support it.** It is not available for Help Text, sub-schema and auto-calculated fields.

#### Related

* Task: [Add Advisory Text to a Field](add-advisory-text.md)
