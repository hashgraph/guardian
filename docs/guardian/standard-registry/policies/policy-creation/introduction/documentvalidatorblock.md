# documentValidatorBlock

This block is to validate documents, including linked documents. This block returns an error if at least one of the checks don’t pass. It can be placed as a ‘child’ document, or as a link in the sequence of the blocks.

![](<../../../../../.gitbook/assets/image (13) (3) (2).png>)

### Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td><strong>documentValidatorBlock</strong></td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>VVB</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>DocumentType</td><td>Type of the documents to be validated.</td><td><p>· VC Document</p><p>· VP Document</p><p>· Related VC<br>Document</p><p>. Related VP Document</p></td><td></td></tr><tr><td>Check Schema</td><td>Validates schema documents.</td><td>Schema</td><td></td></tr><tr><td>Check Own Document</td><td>If ‘true’ validates document owners.</td><td>True / False</td><td></td></tr><tr><td>Check Assign Document</td><td>If ‘true’ validates document owners.</td><td>True / False</td><td></td></tr><tr><td>Conditions</td><td>Array containing conditions for validation.</td><td>Array</td><td></td></tr></tbody></table>

![](<../../../../../.gitbook/assets/image (23) (5) (1).png>)

### Document Type

The following document types are supported:

1. VC Document : validates the main document and its type (Verifiable Credential).
2. VP Document : validates the main document and its type (Verifiable Presentation).
3. Related VC Document : validates the document linked to the main document and its type (Verifiable Credential)
4. Related VP Document : validates the document linked to the main document and its type (Verifiable Presentation)

### Conditions

#### Condition N

#### Type:

1. Equal – resolves to ‘true’ if value of the field is equal the the content of the Value parameter.
2. Not Equal – resolves to ‘true’ if value of the field is NOT equal the the content of the Value parameter.
3. In – resolves to ‘true’ if value of the field is present the the array.
4. Not In – resolves to ‘true’ if value of the field is present the the array.

#### Field :

This field of the document to validates the Value parameter.

#### Value:

The content of this parameter is compared to the content of the Field.
