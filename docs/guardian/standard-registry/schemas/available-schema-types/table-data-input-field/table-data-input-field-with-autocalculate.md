# Table Data Input Field with AutoCalculate

## 1. Overview

The Table field lets you:

* Import CSV data
* Edit or fill it manually
* Use the data in AutoCalculate expressions

## 2. Expression Engine

AutoCalculate expressions are evaluated as **JavaScript**. The expression is wrapped in `with (this) { return <expression> }` where `this` is the current document, so you can reference sibling fields directly by name.

### 2.1 Expression Help Panel

When editing an Auto Calculate expression, a **?** help icon appears next to the "Edit expression" button. Hovering over it shows a quick reference tooltip:

<figure><img src="../../../../../../.gitbook/assets/expression-help-tooltip.png" alt=""><figcaption><p>Help tooltip with operators, functions, and an example</p></figcaption></figure>

Click "Edit expression" to open the Code Editor. Click the **?** icon in the editor header to open the Expression Help panel on the right side:

<figure><img src="../../../../../../.gitbook/assets/expression-help-editor-fields.png" alt=""><figcaption><p>Code Editor with Expression Help panel showing available fields</p></figcaption></figure>

The help panel provides:

* **Available Fields** — clickable chips of sibling field names; click to insert at cursor
* **Operators** — all supported JS operators with labels
* **Functions** — grouped by category (Math, Array, Type conversion) with click-to-insert

<figure><img src="../../../../../../.gitbook/assets/expression-help-operators-functions.png" alt=""><figcaption><p>Operators and function categories in the help panel</p></figcaption></figure>

* **Parameters** — the `table` helper and its methods with usage descriptions
* **Examples** — ready-to-use expression patterns covering common scenarios

<figure><img src="../../../../../../.gitbook/assets/expression-help-parameters-examples.png" alt=""><figcaption><p>Table helper methods and expression examples</p></figcaption></figure>

The editor and help panel scroll independently, so you can browse the reference while writing your expression.

### 2.2 Supported Functions

| Category | Functions |
| --- | --- |
| Math | `Math.abs()`, `Math.round()`, `Math.floor()`, `Math.ceil()`, `Math.sqrt()`, `Math.pow()`, `Math.log()`, `Math.log10()`, `Math.exp()`, `Math.min()`, `Math.max()`, `Math.trunc()`, `Math.sign()` |
| Array | `.reduce()`, `.filter()`, `.map()`, `.length` |
| Type conversion | `Number()`, `String()`, `parseFloat()`, `parseInt()` |

### 2.3 Expression Validation

The editor validates expressions by compiling and executing them against mock data, using the same mechanism as the backend. This catches:

* Syntax errors (unmatched parentheses, invalid operators)
* Undefined functions (e.g. `SUM()` is not valid — use `.reduce()` instead)
* Undefined field references

If validation reports a warning, you can still save the expression using the **Save Anyway** button.

<figure><img src="../../../../../../.gitbook/assets/expression-help-validation.png" alt=""><figcaption><p>Validation warning for an undefined field reference, with Fix and Save Anyway options</p></figcaption></figure>

### 2.4 Nested Schema Fields

If a sibling field references another schema (isRef), you can access its sub-fields using dot notation:

```
subSchema.width * subSchema.height
```

### 2.5 Local Variables (IIFE)

Since expressions must be a single return value, use an IIFE for local variables:

```
(() => { const tax = price * 0.2; return price + tax; })()
```

## 3. Expression Helper: table

Inside AutoCalculate expressions, a helper object named table is available with the following functions:

* table.keys(tbl) → string\[] – returns ordered column names
* table.rows(tbl) → Record\<string,string>\[] – returns an array of row objects (data rows only)
* table.cell(tbl, rowIndex, keyOrIndex) → unknown – accesses a cell by row and column
* table.col(tbl, keyOrIndex) → unknown\[] – returns a whole column (by name or index)
* table.num(value) → number – tolerant number conversion (''/text → 0; '1,23' → 1.23)

{% hint style="info" %}
Note: Expressions run as JavaScript with the current document bound as this, so you can reference table fields directly by their schema names (e.g., field20).
{% endhint %}

## 4. Headers & Indexing

* The first CSV row is treated as the header (column names).
* Data starts at the second CSV row; in the API this is row index 0.
* Row and column indices are zero-based (0, 1, 2, …).
* If your CSV has no meaningful headers, the first row is still used as the header. To avoid relying on header text, use numeric column indices (0, 1, 2, …).

## 5. Cell Map Example

Sample table:

| Product | Qty | Price |
| ------- | --- | ----- |
| 1       | 1   | 3     |
| 2       | 4   | 5     |
| 3       | 6   | 8     |

Coordinates of data (zero-based):

* (0,0)=1, (0,1)=1, (0,2)=3
* (1,0)=2, (1,1)=4, (1,2)=5
* (2,0)=3, (2,1)=6, (2,2)=8

## 6. Access Patterns

### 5.1 By Column Name

table.col(field20, 'Price')  // entire 'Price' column from table field20

### 5.2 By Column Index (no headers dependence)

table.col(field20, 2)  // third column (index 2)

### 5.3 Single Cell by Coordinates

table.cell(field20, 1, 'Qty')  // row 1 (second data row), column 'Qty'

table.cell(field20, 2, 2)      // row 2, column index 2

## 7. In-Table Calculations (Single Table)

### 6.1 Sum of a Named Column (Price)

table.col(field20, 'Price').reduce((s, v) => s + table.num(v), 0)

### 6.2 Sum of a Column by Index (third column)

table.col(field20, 2).reduce((s, v) => s + table.num(v), 0)

### 6.3 Specific Cells + Power

Access cells by coordinates only (works even if headers are not meaningful):

```
Math.pow(
  table.num(table.cell(field20, 1, 1)) +  // Qty[1]
  table.num(table.cell(field20, 2, 2)),   // Price[2]
  2
)
```

## 8. Cross-Table Calculations & Other Fields

### 7.1 Sum a column from field20, add a column from field30, add a numeric form field field21, then square the total

```
Math.pow(
  // sum of 'Price' from field20
  table.col(field20, 'Price').reduce((s, v) => s + table.num(v), 0) +
  // sum of 'Price' from field30
  table.col(field30, 'Price').reduce((s, v) => s + table.num(v), 0) +
  // numeric form field
  field21,
  2
)
```

### 7.2 Index-Only Variant (no header dependency)

```
Math.pow(
  table.col(field20, 2).reduce((s, v) => s + table.num(v), 0) +
  table.col(field30, 1).reduce((s, v) => s + table.num(v), 0) +
  table.num(field21),
  2
)
```

## 9. Power & Root Examples

* Square: (a + b) \*\* 2 or Math.pow(a + b, 2)
* Square root: Math.sqrt(x)  // same as Math.pow(x, 0.5)
* (table.num(table.cell(field20, 0, 2)) \*\* 2)
* Math.sqrt(table.num(table.cell(field20, 2, 2)))



\
\
