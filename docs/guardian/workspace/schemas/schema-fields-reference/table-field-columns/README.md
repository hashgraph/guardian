---
tags:
  - concept
  - tag: new
    primary: true
---

# Table Field Columns

Table Columns let a schema author declare the columns of a Table field - a display name and a stable key for each - while building the schema, instead of the keys being inferred later from whatever text sits in the header row of an uploaded file.

Declaring columns is optional. A Table field with no declared columns keeps working exactly as before: its column keys come from the first row of each uploaded CSV file.

### The problem it solves

A Table field's keys used to come only from the uploaded file's header row. Two files for the same field with differently worded headers - `CO2` versus `CO2 (tonnes)` - produce documents with different keys, so a `table.col(field, "CO2")` expression, a Custom Logic script, or an API consumer written against one file silently stops matching the other. Nothing in the schema records what the columns are supposed to be, so a mismatch is only caught by re-reading data by hand.

Declared columns give the schema a single, stable name for each column, independent of what any particular uploaded file happens to say in its first row.

### How it works

**A Define columns switch turns declaration on for a Table field.** Off is the default and the legacy behavior: no `tableColumns` on the field, keys come from the uploaded file. On adds one column row and requires at least one column at all times.

**Each column has a display name and a key.** Typing a display name, for example `CO2 (tonnes)`, derives the key automatically - `co2_tonnes`. The key stays read-only while it is derived. Clicking the pencil inside the key input unlocks it for manual editing; clicking the pencil again rebuilds it from the name. Keys must be non-empty, free of whitespace, and unique within the field.

**Column order is set by dragging rows**, and that order is the column order everywhere the table is shown - the form, the document view, and calculations that read columns by position.

**The declared columns live in the schema field's `$comment`**, the same place other field metadata such as `unit` or `enumName` is stored, so an unknown property never reaches AJV schema validation.

**An uploaded file is matched to declared columns by position, not by header text.** Guardian expects exactly as many columns as are declared. If the file's first row matches the declared display names or keys, that row is recognized as a header and excluded from the data; otherwise the first row is treated as data. Either way, the values produced in the document are keyed by the declared keys, not by whatever the file's header said.

**Consumers read the same stable keys.** The `table` helper available to AutoCalculate expressions, Math Block Advanced JavaScript, and Custom Logic scripts resolves a declared column by its key, for example `table.col(tableData, 'co2_tonnes')`, and stays correct no matter what an uploaded file's header row says. A legacy Table with no declared columns still works with the same helper, using the header text itself as the key, for example `table.col(tableLegacy, 'CO2 (tonnes)')`.

**Declared columns can also be used in ordinary Math Block formulas, with no JavaScript.** On the Math Block's **Inputs** tab the field picker opens a Table field that declares columns and lists them by display name. A variable bound to a column receives that column's cells in row order, so an ordinary formula on **Formulas → General** can read a table directly: `Σ area` sums the column, `Lookup(area, year, "2021")` finds a value by another column, `At(area, 1)` takes one row, `Length(area)` gives the row count, and `Σ (from i=1 to Length(area)) At(area, i) · At(factor, i)` calculates per row and totals the result. No new formula functions were added - the existing ones accept a column. A numeric function replaces a cell that holds no number with `0`, keeps the row in its place, and reports the count for that column in the policy log. Ordinary formulas are limited to 10 000 rows, and a larger table stops with a message naming the row count and the limit. A column is input only: it cannot be picked or typed as an Output, because a policy cannot write a table back. A Table field with **Define columns** off has nothing to open in the picker and stays reachable only through the Advanced tab.

**The policy documents API can expand a Table's file into rows without the caller parsing CSV.** `GET /policies/{policyId}/documents` accepts `expandTables=true`, plus `tableOffset`, `tableLimit`, and a `tableColumns` filter of comma-separated keys, and returns each Table's rows as objects keyed by the declared keys - or by the file's header text for a legacy Table. The stored document, its signature, and its IPFS copy are unchanged; expansion happens only in the response, bounded by a server-side row ceiling.

**XLSX schema export and import carry the declared columns as well.** A Table field's row in the exported spreadsheet keeps its column names, keys, and order as a JSON array in the `Parameter` cell, so a schema round-tripped through Excel keeps its column configuration.

### Key distinctions

* **Optional, not required.** Declaring columns is a stricter contract an author opts into. An author who does not yet know a file's structure can leave a Table field undeclared.
* **Keys are stable identifiers, display names are labels - but only once the key is unlocked.** The key is what a formula, script, or API consumer matches on. The display name is what a person sees in the form and the document view. While the key is still derived from the name, renaming the display name rewrites the key to match, by design. Unlocking the key with the pencil breaks that link: after that, renaming the display name no longer changes the key.
* **Files are matched by position, not by column name.** The number and order of a declared Table's columns must match the uploaded file. A header row is recognized by content, but it is never used to remap columns.
* **A Table field saved before this feature has no declared columns and is unaffected.** It keeps deriving keys from each uploaded file's header row.
* **Declaring columns is what opens the General tab to a table.** Only a declared column can become a formula variable. An undeclared Table field is still read the way it always was, through the `table` helper on the Advanced tab.

### Related

* Task: [Configure Table Columns](configure-table-columns.md)
* Concept: [Table Data Input Field](../table-field/) - the Table field itself: importing, editing and viewing table data.
