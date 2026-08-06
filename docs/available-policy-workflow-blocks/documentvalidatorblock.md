# documentValidatorBlock

This block is to validate documents, including linked documents. This block returns an error if at least one of the checks don’t pass. It can be placed as a ‘child’ document, or as a link in the sequence of the blocks.

![](<../.gitbook/assets/image (13) (2).png>)

### Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td>documentValidatorBlock</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>VVB</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error occurs in the Block</td><td><p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>DocumentType</td><td>Type of the documents to be validated.</td><td><p>· VC Document</p><p>· VP Document</p><p>· Related VC<br>Document</p><p>. Related VP Document</p></td><td></td></tr><tr><td>Check Schema</td><td>Validates schema documents.</td><td>Schema</td><td></td></tr><tr><td>Check Own Document</td><td>If ‘true’ validates document owners.</td><td>True / False</td><td></td></tr><tr><td>Check Assign Document</td><td>If ‘true’ validates document owners.</td><td>True / False</td><td></td></tr><tr><td>Conditions</td><td>Array containing conditions for validation.</td><td>Array</td><td></td></tr></tbody></table>



![](<../.gitbook/assets/image (23) (1) (1).png>)

### Document Type

The following document types are supported:

1. VC Document : validates the main document and its type (Verifiable Credential).
2. VP Document : validates the main document and its type (Verifiable Presentation).
3. Related VC Document : validates the document linked to the main document and its type (Verifiable Credential)
4. Related VP Document : validates the document linked to the main document and its type (Verifiable Presentation)

### Conditions

#### Condition N

#### Type:

1. Equal – resolves to ‘true’ if the value of the field is equal to the content of the Value parameter.
2. Not Equal – resolves to ‘true’ if the value of the field is NOT equal the content of the Value parameter.
3. In – resolves to ‘true’ if the value of the field is present in the array.
4. Not In – resolves to ‘true’ if the value of the field is present in the array.

#### Field:

The Field of the document to validate the Value parameter.

Field paths use dot-notation and support array traversal. When a segment resolves to an array the remainder of the path is mapped over each element, producing a list of leaf values that is then checked with **for-all** semantics — the condition passes only if every element satisfies it.

Special segments:
* **`L`** — last element of the array (e.g. `items.L.qty`)
* **`0`, `1`, … (integer)** — element at that index (e.g. `items.0.qty`)

> **Empty-array behaviour**: if the field resolves to an empty array the condition always **fails**, regardless of operator.

#### Value Type:

Controls how the **Value** field is interpreted:

| Option | Behaviour |
|---|---|
| **Value** | The text entered in Value is compared directly (with type coercion, e.g. `"10"` matches `10`). |
| **Input Document** | The Value field is treated as a dot-notation path into the same document. The resolved value is used for comparison, enabling field-to-field checks and array-to-array pairwise comparison. |

When both Field and Value resolve to arrays of the same length a **pairwise** comparison is performed (each element compared to its positional counterpart). A length mismatch always fails.

#### Value:

The content of this parameter is compared to the content of the Field. When Value Type is **Input Document** this is a dot-notation field path; otherwise it is a literal value.

**`in` / `not_in` with Input Document**: if the value path resolves to an array, membership is checked — i.e. the field value must appear in (or be absent from) that collection.
