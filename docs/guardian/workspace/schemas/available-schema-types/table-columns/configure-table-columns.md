---
tags:
  - tasks
---

# Configure Table Columns

Declare the columns of a Table field so forms, calculations, APIs and the Indexer use stable keys that do not depend on the text in an uploaded file. See [Table Columns](README.md) for how declared columns behave.

### Prerequisites

* You have a schema open in the schema editor in **DRAFT** status.
* You know the number and order of columns that uploaded files will contain.

### Steps

#### Add or select a Table field

1. Add a schema field and choose **Table** as its type, or select an existing Table field.
2. The **Table columns** section appears at the bottom of the field settings.

#### Define the columns

1. Turn on **Define columns**. A new Table field starts with the toggle on and one empty column row.
2. Enter a display name for the first column. Guardian creates a key from the name and keeps the key read-only while the name changes - for example, `CO2 (tonnes)` becomes `co2_tonnes`.
3. To choose a different key, click the pencil in the key input and edit it. Click the pencil again to return to the generated key.
4. Click **Add column** for each additional column. Drag rows by their handles until their order matches the files that users will upload. Use the trash button to remove a row.

Each column needs a display name and a key. Keys cannot contain spaces and must be unique within the Table field. A declared Table must keep at least one column.

Leave the toggle off only when the field must keep the legacy behavior, where column keys come from the first row of every uploaded CSV file.

#### Save the schema

1. Click **Save all**.
2. Close and reopen the schema if you want to verify that the toggle, names, keys and order were stored.

#### Export or import the schema as XLSX

1. Export the schema. If **Define columns** is on, the Table field's row appears with type `Table`, and its `Parameter` cell contains the ordered column configuration as JSON:

   ```json
   [{"name":"Year","key":"year"},{"name":"CO2 (tonnes)","key":"co2_tonnes"}]
   ```
2. To import a Table field with declared columns, use the same JSON format in the `Parameter` cell, with entries in the same order as the file columns. A blank `Parameter` cell means **Define columns** is off.
3. Import the file. Guardian rejects the import when a non-empty Table `Parameter` is not valid JSON, is an empty array, contains an empty name or key, contains whitespace in a key, or repeats a key.

#### Upload a matching CSV file

1. When the schema is used in a form, upload a CSV file with exactly the declared number of columns. Guardian maps file columns to schema columns by position.
2. If the first row matches the declared display names or keys, Guardian recognizes it as a header and does not include it in the data rows. Otherwise, the first row is treated as data. Header text does not change the declared keys.

#### Use declared keys in a calculation

1. Open an AutoCalculate expression, a Math Block's **Formulas → Advanced (Optional)**, or a Custom Logic script.
2. Reference the Table field's declared column with the `table` helper, using the key rather than the display name: `table.col(tableData, 'co2_tonnes')`.
3. A legacy Table with no declared columns still works with the same helper, using the exact text of its file's header row as the key instead: `table.col(tableLegacy, 'CO2 (tonnes)')`.

#### Read declared keys through the policy documents API

1. Call `GET /policies/{policyId}/documents` with `includeDocument=true` and `expandTables=true`.
2. Optionally add `tableOffset`, `tableLimit`, and a `tableColumns` filter of comma-separated keys to bound which rows come back.
3. Each Table value in the response gains a `rows` array keyed by the declared keys - or by the file's header text for a legacy Table - alongside `columnNames`, `columnKeys`, and paging fields (`rowsTotal`, `rowsOffset`, `rowsRequested`, `rowsTruncated`). The stored document itself is not changed by this call.

### Result

Guardian stores the Table value with both `columnNames` and `columnKeys`. Guardian and the Indexer show the display names, while calculations, scripts and expanded API row objects use the stable keys.

XLSX schema export and import preserve the Table field's column names, keys and order. A blank Table `Parameter` preserves the toggle-off state.

Table fields created before this feature have no declared columns and continue to work. Their column keys come from the first row of each uploaded CSV file.

### Troubleshooting

**The schema does not save.** Check that every column has a display name and key, that no key contains spaces, and that keys are unique within the field.

**The file is rejected after upload.** Its number of columns does not match the schema. Correct the file or the draft schema, then upload it again.

**Values appear under the wrong names.** Guardian matches columns by position, not by header text. Reorder the file columns or the declared rows so both orders match.

**The XLSX schema cannot be imported.** Check the Table row's `Parameter` cell. When it is not blank, it must contain a non-empty JSON array of unique `name` and `key` pairs. Keys cannot contain whitespace.

### Related

* Concept: [Table Columns](README.md)
