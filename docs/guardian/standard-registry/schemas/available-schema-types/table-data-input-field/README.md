# Table Data Input Field

A Table field lets you add CSV-based tables to documents:

* Import a CSV file
* Edit or fill it by manually
* Use table data in calculations with other fields
* View and download results in both Guardian and Indexer.

### 1. Add this field to a policy schema

Add a Table-type field to a schema so users can work with it in forms.

Setup:

* Choose Field type: Table.
* Multiple table fields can be added in one document.
* All table fields can participate in calculations (cross-table formulas, sums, links with other fields, etc.).

<figure><img src="../../../../../.gitbook/assets/unknown (7) (1).png" alt=""><figcaption></figcaption></figure>

### 2. Use the field while filling the form

When added to a schema, the table is shown to a user during data entry.

Available options:

* Import CSV: load a file and preview the first rows/columns.
* Export/Download CSV: download the current state of the table.
* Edit: open the table in a dialog and update cells.
* Create manually: start with an empty table and fill it by hand.

<figure><img src="../../../../../.gitbook/assets/unknown (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/unknown (2) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 3. Run calculations (inside a table and with other fields)

Use table data in document formulas and logic.

Options:

* Inside a table – row/column calculations (e.g., sums, averages, etc.).
* With other form fields – via:
* AutoCalculate field (automatic calculation)
* Custom Logic Block (custom rules/logic)

<figure><img src="../../../../../.gitbook/assets/unknown (3) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/unknown (4) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../../.gitbook/assets/unknown (5) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 4. Save a prefilled table as a Draft

Save an unfinished form with imported/entered table data and return to it later.

<figure><img src="../../../../../.gitbook/assets/unknown (6) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 5. View and download results in document view

What it does:

* In Guardian, VC document view shows tables and calculated values.
* In Indexer, the same table is available for viewing and downloading.

<figure><img src="../../../../../.gitbook/assets/unknown (7) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 6. Limits and performance

* If the table size exceeds 10 MB, manual editing in the UI is not available.
* To edit:, download the CSV, update it externally,then re-import.
* Calculations still work above 10 MB, but:
* Performance may be slower
* Preview is limited to the first rows/columns

<figure><img src="../../../../../.gitbook/assets/unknown (8) (1).png" alt=""><figcaption></figcaption></figure>

## Demo Video

[Youtube](https://youtu.be/m3waGJ7qgs4?si=0bEJusqaQ2hPEU4t\&t=121)
