# customLogicBlock

## Properties

<table><thead><tr><th width="208">Block Property</th><th>Definition</th><th width="200">Example Input</th><th>Status</th></tr></thead><tbody><tr><td>tag</td><td>Unique name for the logic block.</td><td><strong>customLogicBlock</strong></td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>NoRole</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>On errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul></td><td></td></tr><tr><td>Stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>Output Schema</td><td>Sending the logic output to this particular Schema</td><td>Report Employee schema</td><td></td></tr><tr><td>Document Signer</td><td>defines who will sign processed document.<br>Options:<br>1. Policy Owner<br>2. First Document Owner<br>3. First Document Issues</td><td>Policy Owner</td><td></td></tr><tr><td>Id Type</td><td>defines Id Type in credential subject of processed document.<br>Options:<br>1. DID (new DID)<br>2. UUID (new UUID)<br>3. Owner (Owner DID)</td><td>UUID (new UUID)</td><td></td></tr></tbody></table>

{% hint style="info" %}
**Note:** Only this block supports artifacts for now.
{% endhint %}

This block supports two types of artifacts : JSON (.json) and Executable Code (.js).

**JSON** : will be added to the “artifacts” variable which is array in specific order (for example artifacts\[0] is e\_grid\_mapping json object).

**Executable Code** : will be executed before main function.

To access table data in customlogic block, please check [Custom Logic Block & Tables](../../../schemas/available-schema-types/table-data-input-field/custom-logic-block-and-tables.md) for more details.
