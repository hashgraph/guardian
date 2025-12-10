# Custom Logic Block & Tables

### 1. Purpose

The Custom Logic Block lets you run custom JavaScript or Python over input documents and/or sources and return either:

* the same document with updated fields (Pass original: ON), or
* a new VC (unsigned or signed) (Pass original: OFF).

Access to table data inside expressions is identical to AutoCalculate and uses the table helper:

* table.keys(tbl) → column names
* table.col(tbl, keyOrIndex) → column values
* table.rows(tbl) → data rows
* table.cell(tbl, rowIndex, keyOrIndex) → a cell
* table.num(value) → safe number conversion

{% hint style="info" %}
Note: the expression has access to documents, sources, table, and done(result) to return the result.
{% endhint %}

### 2. When to use each mode

#### Pass original: ON

* You return the entire document (or an array) after modifications.
* Does not create a new VC, does not validate by schema, and does not sign.
* Easiest and most reliable way to “compute and write a field” in an existing VC.

#### Pass original: OFF

* Creates a new VC (unsigned or signed).
* Requires additional setup:
* Unsigned VC → return only the subject (or an array of subjects). Must include valid id, type, @context (or set outputSchema, which provides @context/type).
* Signed VC → set outputSchema, configure documentSigner, and return JSON matching the schema.

{% hint style="info" %}
If any of these are missing, VC build/validation may fail (e.g., “Cannot read properties of undefined (reading 'codeVersion')”, “…getId…”).
{% endhint %}

### 3. Working expressions (Pass original: ON)

#### 3.1. Subtotal by table and grand total with a form field

* Sums Qty \* Price per row.
* Adds a numeric form field field21.
* Writes results to calcSubtotal and calcTotal in the subject.

```
(() => {
  const list = Array.isArray(documents) ? documents : [documents];

  const updated = list.map((doc) => {
    const cs = Array.isArray(doc?.document?.credentialSubject)
      ? doc.document.credentialSubject[0]
      : doc?.document?.credentialSubject;
    if (!cs) return doc;

    const tableValue = cs?.field1?.field20 ?? cs?.field20;
    const extraValue = cs?.field1?.field21 ?? cs?.field21;

    const allRows = table.rows(tableValue) || [];
    const rows = allRows.filter(r => (r['Product']) !== 'Product');

    const calcSubtotal = rows.reduce((sum, r) => {
      const qty   = table.num(r['Qty']);
      const price = table.num(r['Price']);
      return sum + qty * price;
    }, 0);

    const calcTotal = calcSubtotal + table.num(extraValue);

    cs.calcSubtotal = calcSubtotal;
    cs.calcTotal = calcTotal;

    return doc;
  });

  done(Array.isArray(documents) ? updated : updated[0]);
})();

```

#### 3.2. Sum a column by name and write to field21

* Finds the “Price” column by name.
* Sums values and writes the result to field21 (works with nested/flat schema).

```
(() => {
  const list = Array.isArray(documents) ? documents : [documents];

  const updated = list.map((doc) => {
    const cs = Array.isArray(doc?.document?.credentialSubject)
      ? doc.document.credentialSubject[0]
      : doc?.document?.credentialSubject;
    if (!cs) return doc;

    const tbl = cs?.field1?.field20 ?? cs?.field20;

    let sumPrice = 0;
    if (tbl) {
      const keys = table.keys(tbl) || [];
      const priceKey = keys.find(k => String(k).trim() === 'Price');
      if (priceKey) {
        const col = table.col(tbl, priceKey) || [];
        sumPrice = col.reduce((s, v) => s + table.num(v), 0);
      }
    }

    if (cs?.field1) cs.field1.field21 = sumPrice;
    else cs.field21 = sumPrice;

    return doc;
  });

  done(Array.isArray(documents) ? updated : updated[0]);
})();

```

#### 3.3. Index-only

* Sums the third column (index 2) by index only.
* Writes the result to field21.

```
(() => {
  const list = Array.isArray(documents) ? documents : [documents];

  const updated = list.map((doc) => {
    const cs = Array.isArray(doc?.document?.credentialSubject)
      ? doc.document.credentialSubject[0]
      : doc?.document?.credentialSubject;
    if (!cs) return doc;

    const tbl = cs?.field1?.field20 ?? cs?.field20;

    let total = 0;
    if (tbl) {
      const col = table.col(tbl, 2) || [];
      total = col.reduce((s, v) => s + table.num(v), 0);
    }

    if (cs?.field1) cs.field1.field21 = total;
    else cs.field21 = total;

    return doc;
  });

  done(Array.isArray(documents) ? updated : updated[0]);
})();

```

### 4. Doing the same with Pass original: OFF

#### Unsigned VC: ON

Return only credentialSubject (or an array). Make sure you provide valid:

* id (can be set or generated),
* type, @context (may come from outputSchema if set in the block).

Without these, raw VC build will fail.

#### Signed VC (Unsigned: OFF)

* Set outputSchema.
* Return a subject that matches the schema.
* Configure documentSigner.

The block will then:

* validate the subject against the schema,
* add service fields,
* sign the VC.

Any mismatch with outputSchema will cause validation/signing errors.

\
