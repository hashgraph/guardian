# externalDataBlock

This block is used for VC documents which are based on (or ‘conform to’) a schema which contains embedded schemas, extractDataBlock provides means to extract a data set which corresponds to any of these embedded schemas (at any depth level), and if required after processing to return the updated values back into the VC dataset to their original ‘place’.

## 1. Properties

| Property Name | Details                                                                                                                                                                 | Example                                                                                                                                                                                                        | Status |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Action        | an action which is executed by the block                                                                                                                                | <p>o   Get – find and extract the part of the document which corresponds to the specified schema</p><p>o   Set – update the part of the document, which corresponds to the specified schema, with new data</p> |        |
| Schema        | the schema which is target of the action. It is used to identify the embedded part of the data object - i.e. the field in the document which corresponds to this schema | Contact Details (1.1)                                                                                                                                                                                          |        |

### 1.1 Extraction

<figure><img src="../../../../../.gitbook/assets/image (590).png" alt=""><figcaption></figcaption></figure>

### 1.2 Update

<figure><img src="../../../../../.gitbook/assets/image (591).png" alt=""><figcaption></figcaption></figure>
