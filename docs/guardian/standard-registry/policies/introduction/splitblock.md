# splitBlock

This block allows to accumulate VC documents and produce new VCs in fixed chunks.

If the value in the VC is higher than the chunking threshold the VC would be “spilt” into multiple VCs containing values equal to the threshold value.

## 1. Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th width="200">Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td>multiSignBlock</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>NoRole</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>Stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>Threshold</td><td>The size of a single ‘portion’ (chunk) the original document would be “split” into.<br>Note: It is always number>0</td><td>1000</td><td></td></tr><tr><td>Source field</td><td>It is the path to the field in the VC document which is the parameter used in the calculation of the ‘size’ of the VC.<br><strong>Note</strong>: <em>is a field to which the ‘source field’ path points. It must be of numeric type.</em></td><td>source path link</td><td></td></tr></tbody></table>

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
