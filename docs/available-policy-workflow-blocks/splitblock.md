# splitBlock

This block allows to accumulate VC documents and produce new VCs in fixed chunks.&#x20;

If the value in the VC is higher than the chunking threshold the VC would be “spilt” into multiple VCs containing values equal to the threshold value.

## 1. Properties



| Block Property   | Definition                                                                                                                                                                                                                                       | Example Input                                                                         | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                                                                                                                                                                                 | multiSignBlock                                                                        |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                                                                                                                                                                                | NoRole                                                                                |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.                                                                                                                                                                | Checked or unchecked.                                                                 |        |
| On errors        | Called if the system error has occurs in the Block                                                                                                                                                                                               | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation | End processing here, don't pass control to the next block.                                                                                                                                                                                       | Checked or unchecked.                                                                 |        |
| Threshold        | <p>The size of a single ‘portion’ (chunk) the original document would be “split” into.<br>Note: It is always number>0</p>                                                                                                                        | 1000                                                                                  |        |
| Source field     | <p>It is the path to the field in the VC document which is the parameter used in the calculation of the ‘size’ of the VC.<br><strong>Note</strong>: <em>is a field to which the ‘source field’ path points. It must be of numeric type.</em></p> | source path link                                                                      |        |

## 2. Data(VC documents) format

After ‘splitting’ of the VC document into several chunks these new created VCs will contain:

1. All fields except the ‘source field’ copied without any changes.
2. Added **evidence** section of the following content:

```
{
            "type": [
                "SourceDocument"
            ],
            "messageId": "1655895001.624621306",
            "sourceField": "document.credentialSubject.0.field0",
            "sourceValue": 200,
            "threshold": 50,
            "chunkNumber": 1,
            "maxChunk": 4
        }

```
