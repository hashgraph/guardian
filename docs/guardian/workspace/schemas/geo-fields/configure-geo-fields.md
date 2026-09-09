---
tags:
  - tasks
---

# Configure Geo Fields

Add Country, Continent, and State/Province fields to a schema and optionally link them so they cascade together in a form.

### Prerequisites

* You have a schema open in the schema editor in **DRAFT** status.
* To link fields, you need at least two geo fields of compatible types in the same schema object (for example, a Country and a Continent).

### Steps

#### Add a geo field

1. Open the schema editor and click **Add Field**.
2. In the **Type** dropdown, select **Country**, **Continent**, or **State/Province**.
3. Enter a description for the field (for example, `Project Country`).
4. Click **Save**.

Repeat for each geo field you want to add.

#### Link fields into a cascading group (optional)

1. Select the child field (for example, Country, which you want to depend on Continent).
2. Open the **Depends on** selector and choose the parent field. Only compatible parents are offered — Continent for Country; Country or Continent for State/Province.
3. Click **Save** on the field. Repeat for each child field you want to link.

A State/Province field may point directly to a Country without a Continent present — the group is formed from whatever fields are declared.

#### Save the schema

Click **Save all**. The dependency links are stored in the schema's `$comment` fields and are restored the next time you open the schema.

#### Verify in a generated form

You can verify the cascade behavior directly in the schema editor by clicking **Preview**, or by opening a **Dry Run** for the policy that uses this schema.

* Selecting a country filters the State/Province dropdown to that country's subdivisions and fills in the Continent field.
* Selecting a state fills in its country and continent.
* Selecting a continent narrows the Country dropdown to countries on that continent.

#### Export to Excel

1. Open the schema and click **Export → Excel**.
2. In the downloaded `.xlsx` file, the geo fields appear with `Country`, `Continent`, or `State/Province` in the **Field Type** column.
3. If a child field has a parent, the parent field's key appears in the **Parameter** column of the child row.
4. The **Test Value**, **Default Value**, and **Suggest Value** columns show display names for Country (`United States`) and Continent (`North America`). State/Province keeps its code in both directions (for example, `CA-ON` for Ontario).

#### Import from Excel

1. Fill in the **Field Type** column with `Country`, `Continent`, or `State/Province`.
2. To declare a parent link, enter the parent field's key in the **Parameter** column of the child row. Leave **Parameter** blank to import the field without a parent.
3. Import the file. If the **Parameter** value does not match any field key in the schema, or the pairing is not a legal ancestor relationship, the import result shows a row-level error identifying the sheet and row.

### Result

Each geo field in the form shows a searchable dropdown populated from the ISO 3166 dataset. Linked fields filter and auto-populate each other as the user makes selections. Submitted documents are validated server-side: field values must exist in the dataset, and linked fields must be mutually consistent.

A schema exported and re-imported preserves the field types and dependency links without manual edits to the `.xlsx` file.

### Related

* Concept: [Geo Fields](./)
