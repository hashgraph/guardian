# documentValidatorBlock

This Block is to validate documents, including linked documents. This block returns an error if at least one of the checks don’t pass. It can be placed as a ‘child’ document, or as a link in the sequence of the blocks.

![](<../.gitbook/assets/image (13).png>)

### Properties

| Block Property        | Definition                                                                        | Example Input                                                                                       | Status |
| --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| tag                   | Unique name for the logic block.                                                  | documentValidatorBlock                                                                              |        |
| permissions           | Which entity has rights to interact at this part of the workflow.                 | VVB                                                                                                 |        |
| defaultActive         | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                               |        |
| On errors             | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>               |        |
| stop Propagation      | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                               |        |
| DocumentType          | Type of the documents to be validated.                                            | <p>· VC Document</p><p>· VP Document</p><p>· Related VC<br>Document</p><p>. Related VP Document</p> |        |
| Check Schema          | Validates schema documents.                                                       | Schema                                                                                              |        |
| Check Own Document    | If ‘true’ validates document owners.                                              | True / False                                                                                        |        |
| Check Assign Document | If ‘true’ validates document owners.                                              | True / False                                                                                        |        |
| Conditions            | Array containing conditions for validation.                                       | Array                                                                                               |        |



![](<../.gitbook/assets/image (23) (1).png>)

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

#### Field :&#x20;

This field of the document to validates the Value parameter.

#### Value:

The content of this parameter is compared to the content of the Field.
