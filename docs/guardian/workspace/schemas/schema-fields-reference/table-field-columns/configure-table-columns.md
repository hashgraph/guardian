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

#### Use a column in an ordinary Math Block formula

1. Open the Math Block editor and go to **Inputs**.
2. Add a variable row and press the search button. In the field tree, a Table field with declared columns now opens and lists those columns by display name.
3. Pick a column and give the variable a short name, for example `area`. The variable holds the whole column, in row order. Repeat for every column the calculation needs.
4. Go to **Formulas → General** and write an ordinary formula. The existing functions accept a column:

   ```
   Σ area
   Lookup(area, year, "2021")
   At(area, 1)
   Length(area)
   Σ (from i=1 to Length(area)) At(area, i) · At(factor, i)
   ```

   Two columns cannot be multiplied directly as `area · factor`. A per-row calculation is written as the sum above, with a row number.
5. Open the **Testing** tab to run the formula against a real document before running the policy. Each variable is shown as the list of its column cells, and warnings appear on the **Errors** tab.

A cell that holds no number is replaced with `0` by a numeric function; the row keeps its place, and the policy log carries one line per column naming how many cells were replaced. Ordinary formulas are limited to 10 000 rows. A column path remains input only and is not accepted on the **Outputs** tab. To write a table, select the declared Table field itself as described below. A Table field with **Define columns** off cannot be used this way and stays on the Advanced tab.

#### Write Math Block results into a Table

1. In the Math Block editor, create the variables and formulas that will supply the table cells.
2. Go to **Outputs**, add an Output, and select the declared Table field itself. Do not select one of its column paths.
3. In the grid, enter a variable name from **Inputs** or **Formulas** in each cell that needs a value. Leave a cell empty when the output table should keep that cell empty.
4. Set **Add Rows** to a number from 1 to 20 and click it to append rows. One grid can contain up to 1 000 rows.
5. If the Table allows multiple answers or sits inside one repeated schema level, click **Add Table** to configure another table. You can add up to 100 tables, with no more than 1 000 rows in total. Table 1 writes to the first repeated entry, Table 2 to the second, and so on. Other fields already stored in those entries are preserved, and Guardian creates missing entries when another table needs one.
6. Open **Testing** and select a source document. The result shows the same grids with calculated values instead of variable names. Unknown variables and invalid names appear on the **Errors** tab.
7. If the Math Block uses **Advanced (Optional)**, remember that this code runs after the configured Outputs. Changes that it makes to the rows become part of the final table. If it replaces the Table value with another value, that replacement is stored instead of a table.

A legacy Table with **Define columns** off keeps the existing single-value Output. A Table below two or more repeated schema levels also keeps the existing single-value Output.

#### Read declared keys through the policy documents API

1. Call `GET /policies/{policyId}/documents` with `includeDocument=true` and `expandTables=true`.
2. Optionally add `tableOffset`, `tableLimit`, and a `tableColumns` filter of comma-separated keys to bound which rows come back.
3. Each Table value in the response gains a `rows` array keyed by the declared keys - or by the file's header text for a legacy Table - alongside `columnNames`, `columnKeys`, and paging fields (`rowsTotal`, `rowsOffset`, `rowsRequested`, `rowsTruncated`). The stored document itself is not changed by this call.

### Result

Guardian stores the Table value with both `columnNames` and `columnKeys`. Guardian and the Indexer show the display names, while calculations, scripts and expanded API row objects use the stable keys.

Declared columns are also available as variables in ordinary Math Block formulas, so a table can be read on the **General** tab without JavaScript.

When a Math Block writes a declared Table, Guardian creates a table file from the final rows and stores a compact Table reference. Empty cells and completely empty rows are preserved. A published policy run stores the file in GridFS and IPFS; a Dry Run stores it only in GridFS. The document viewer displays the result like an uploaded Table.

Advanced JavaScript runs after the configured Outputs. Its final value is the value shown in Testing and stored during a policy run, whether it changes the generated rows or replaces the Table with another value.

The same Table field can be both an Input and an Output. Formulas read the source document's uploaded table before the Output replaces that field in the new document; the source document is not changed.

XLSX schema export and import preserve the Table field's column names, keys and order. A blank Table `Parameter` preserves the toggle-off state.

Table fields created before this feature have no declared columns and continue to work. Their column keys come from the first row of each uploaded CSV file, and their Math Block Output stays a single value.

### Troubleshooting

**The schema does not save.** Check that every column has a display name and key, that no key contains spaces, and that keys are unique within the field.

**The file is rejected after upload.** Its number of columns does not match the schema. Correct the file or the draft schema, then upload it again.

**Values appear under the wrong names.** Guardian matches columns by position, not by header text. Reorder the file columns or the declared rows so both orders match.

**The Table field does not open in the Math Block field picker.** Its **Define columns** toggle is off. Declare the columns in the schema, or read the table through the `table` helper on the Advanced tab.

**A formula over a column stops with a row-count message.** The table is above the 10 000-row limit of ordinary formulas. Use a smaller file, or move the calculation to the Advanced tab, which is not bound by that limit.

**An Output path with a column is marked as not found.** A column cannot be written to directly. Select the declared Table field itself to build a complete table, or bind the Output to an ordinary field for a single value.

**Selecting a Table Output does not show a grid.** Check that **Define columns** is on and that the path is not below two or more repeated schema levels. Those cases keep the existing single-value Output.

**Testing reports `Unknown variable` or an invalid name.** Every filled grid cell must contain the exact name of a variable from **Inputs** or **Formulas**. Correct the name or leave the cell empty.

**Rows or tables cannot be added.** **Add Rows** accepts 1 to 20 rows at a time. A single grid and all repeated grids together have a 1 000-row limit, and a repeated Output has a 100-table limit.

**The XLSX schema cannot be imported.** Check the Table row's `Parameter` cell. When it is not blank, it must contain a non-empty JSON array of unique `name` and `key` pairs. Keys cannot contain whitespace.

### Related

* Concept: [Table Columns](README.md)
