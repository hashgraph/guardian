---
tags:
  - concept
  - tag: new
    primary: true
---

# Rich Text Fields

A Rich Text field is a schema string field that accepts formatted text instead of one flat paragraph. The author of a schema picks the **Rich Text** type, and the field then offers a small editor - headings, bold, italic, bulleted and numbered lists, and hyperlinks - both to the person filling in a form and to the schema author writing the field's preset values.

The value is stored as **Markdown** in an ordinary string field, so the formatting travels with the document wherever it goes and the document itself carries readable text rather than markup.

### The problem it solves

Every other text field in a schema is plain text. Instructions, notes and guidance all arrive as one unbroken block: there is no way to mark a sentence as important, to break a procedure into a numbered list, or to point at an external page. Long fields become hard to scan, and readers miss the part that mattered.

### How it works

Picking **Rich Text** as a field's type gives it a small toolbar and a writing area, in the form and wherever the schema author sets a preset value. The toolbar covers bold and italic, bulleted and numbered lists, three heading levels, and links.

What you type is saved as Markdown: in its raw form a heading looks like `# Heading` and bold text looks like `**bold**`. The editor hides that while you write - Markdown turns into formatting the moment a value is opened, and formatting turns back into Markdown as you type.

The field's preset values - **Default**, **Suggested** and **Test value** - open the same editor in its own dialog, reached from a small preview card in the field's settings.

The field's type survives an Excel export and import. The Indexer shows the same formatting as Guardian's document view, though it has no editor of its own. Where the full value would not fit - a suggestion under the field, or a documents-grid column set to **Rich Text** - Guardian shows the text and reveals the formatted version on hover.

### Key distinctions

* **The field type decides the rendering, not the content.** A plain String field containing `#` or `**` stays plain text and displays exactly as typed. Only a field set to Rich Text renders as formatted output.
* **Existing fields are untouched.** Every other field type behaves exactly as it did before this feature existed, in the form and in the viewer, including in documents created earlier.

### Related

* Task: [Configure Rich Text Fields](configure-rich-text-fields.md)
