---
tags:
  - tasks
---

# Configure Rich Text Fields

Add a Rich Text field to a schema and use the editor to format text and preset values.

### Prerequisites

* You have a schema open in the schema editor in **DRAFT** status.
* To see the field in a form, you need a policy that uses the schema. A **Dry Run** is enough - the schema does not need to be published.

### Steps

#### Add a Rich Text field

1. Open the schema editor and add a field.
2. In the type picker, select **Rich Text**.
3. Enter a description for the field.
4. Click **Save all**.

#### Set a Default, Suggested or Test value

1. Select the field. In the field-properties panel, **Default**, **Suggested** and **Test value** show as preview cards.
2. Click the pencil on the card you want to edit, and write the value in the dialog that opens.
3. Click **Done**, then **Save all** to save the schema.

The **✕** button next to the pencil clears a value.

While a field with a **Suggested value** is empty, a **Fill the field with suggestion** button appears beneath it in the form - clicking it fills the field.

#### Format text

The toolbar offers bold and italic, bulleted and numbered lists, three heading levels (H1–H3), and inserting a link.

Markdown characters typed as plain text (`**test**`, `# heading`) stay as text rather than turning into formatting - formatting only happens through the toolbar.

#### Add a link

1. Select the text and click the link button.
2. Enter the address and click **Insert**. `http:`, `https:`, `mailto:` and relative addresses are supported.

To change or remove a link, put the cursor inside it and click the link button again.

#### Show the field in a documents grid

1. In the policy configurator, open the documents grid block.
2. Set the column bound to the Rich Text field's **Type** to **Rich Text**.

Without this, the column shows raw Markdown instead of formatted text.

#### Export and import through Excel

1. Export the schema - the field shows `Rich Text` in the **Field Type** column, and its **Default Value**, **Suggest Value** and **Test Value** cells show plain Markdown text, unrendered.
2. To create the field on import, put `Rich Text` in the **Field Type** column, and write the text directly in Markdown syntax in **Default Value**, **Suggest Value** or **Test Value** - for example `**bold**`, `# Heading`, `- item`, `[text](https://example.com)`.

### Result

The field accepts formatted text in the form and stores the value as Markdown. When the document is viewed, the value shows formatted - with headings, lists, emphasis and clickable links - in both Guardian and the Indexer. Other schema fields are unaffected.

### Related

* Concept: [Rich Text Fields](./)
