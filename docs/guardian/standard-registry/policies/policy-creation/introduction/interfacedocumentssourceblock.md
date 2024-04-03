# InterfaceDocumentsSourceBlock

### Properties

<table><thead><tr><th width="179">Block Property</th><th>Definition</th><th>Example Input</th><th>Status</th></tr></thead><tbody><tr><td>type</td><td>A block type which outputs information from the DB as grid.</td><td><strong>InterfaceDocumentsSource Block</strong> (Can't be changed).</td><td></td></tr><tr><td>tag</td><td>Unique name for the logic block.</td><td>sensors_grid.</td><td></td></tr><tr><td>permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>Installer.</td><td></td></tr><tr><td>defaultActive</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or unchecked.</td><td></td></tr><tr><td>dataType</td><td>Specify the table to request the data from.</td><td>Current options are: Verifiable Credential, DID, Approve, or Hedera.</td><td></td></tr></tbody></table>

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

<table><thead><tr><th width="312.6507787525413">UI Property</th><th>Definition</th></tr></thead><tbody><tr><td>Title</td><td>Type of the displayed value, possible options. Current options are: TEXT (ordinary text), BUTTON (a button), or BLOCK (a block embedded into the column).</td></tr><tr><td>Enable common sorting</td><td><ol><li>When it is true, user can sort grid data on UI side, or make POST request to interfaceSourceBlock with body ({ orderField: 'option.status', orderDirection: 'asc'}) to change sorting through the API</li><li>When it is false, user can set order to specific documentSourceAddon block by POST request with same body through the API</li></ol></td></tr><tr><td>Field Name</td><td>Object fields to retrieve the values from. Internal fields are separated by ".", access to array elements is via index. This is the field name.</td></tr><tr><td>Field Type</td><td>Current Options: TEXT, BUTTON, AND BLOCK.</td></tr><tr><td>Field Title</td><td>Title of the column.</td></tr><tr><td>Field Tooltip</td><td>Provide a tooltip for the field.</td></tr><tr><td>Field Cell Content</td><td>Content inside the cell.</td></tr><tr><td>Field UI Class</td><td>Arbitrary Class</td></tr><tr><td>Width</td><td>For example : 100px</td></tr><tr><td>Bind Group</td><td>If interfaceDocumentsSourceBlock has more than one documentsSourceAddon, then you can create different columns for each (names must be the same)</td></tr><tr><td>Bind Block</td><td>Specifying a "bindBlock" field would result in the display of the linked block in side the dialog.. Needs for the field type to be a BLOCK or BUTTON with the Action type as DIALOGUE.</td></tr><tr><td>Action</td><td>Needs for the field type to be a BUTTON. Specifies what action will happen when the button is clicked. Action options are currently: LINK to a URL or prompt a DIALOGUE box.</td></tr><tr><td>Dialogue Type</td><td>Currently only json type is supported. Needs for the field type to be a BUTTON and Action to be DIALOGUE.</td></tr><tr><td>Dialogue Content</td><td>Provide content for the dialogue box. Needs for the field type to be a BUTTON and Action to be DIALOGUE.</td></tr><tr><td>Dialogue Class</td><td>Dialog style. Needs for the field type to be a BUTTON and Action to be DIALOGUE.</td></tr></tbody></table>

### Events

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                          | Description                                                                                                                     |
| ------------- | ------------ | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | -                                      | Type of the event - determines whether this is ingress or egress event for the current block.                                   |
| Source        | "source"     | Block tag(string)                                                 | "block\_tag"                           | The block which initiates the event.                                                                                            |
| Target        | "target"     | Block tag(string)                                                 | "block\_tag"                           | The block which receives the event.                                                                                             |
| Output Event  | "output"     | Event name(string)                                                | "event\_name"                          | Action or issue that caused the event.                                                                                          |
| Input Event   | "input"      | Event name(string)                                                | "event\_name"                          | Action which will be triggered by the event.                                                                                    |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | <p>""</p><p>"owner"</p><p>"issuer"</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |
| Disabled      | "disabled"   | True/False                                                        | true/false                             | Allows to disable the event without deleting it.                                                                                |

To know more information about events, please look at [Events](events.md).

### API Parameters

{% swagger method="get" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}

{% swagger-response status="200: OK" description="Successful Operation" %}
```
{
  "data": [
    {
      "_id": "63da084ddb84efbb04da4588",
      "dryRunId": "63da04e19670adb07f82b092",
      "dryRunClass": "VcDocumentCollection",
      "owner": "did:hedera:testnet:7Vn2KdgTZG2DZkz1x3naEJfazEACCEZGBkGLeUwrh45C_0.0.3075949",
      "hash": "29yk1PWG8h8euDCKFRcV9GXeXGCxhipyjaEnTaEw8wb9",
      "document": {
        "id": "urn:uuid:bd06ea41-9037-4294-b13d-f868563e30f1",
        "type": [
          "VerifiableCredential"
        ],
        "issuer": "did:hedera:testnet:7Vn2KdgTZG2DZkz1x3naEJfazEACCEZGBkGLeUwrh45C_0.0.3075949",
        "issuanceDate": "2023-02-01T06:35:57.132Z",
        "@context": [
          "https://www.w3.org/2018/credentials/v1"
        ],
        "credentialSubject": [
          {
            "field1": {
              "type": "bf7109c2-6ff4-47bb-a39d-02a0f11574b0",
              "@context": []
            },
            "field2": {
              "type": "dee7e78b-44b8-4bb0-8be0-3a86bde752b2",
              "@context": []
            },
            "field3": {
              "type": "86f9436f-82fd-48ce-bce8-37a5130263b0",
              "@context": []
            },
            "policyId": "63da04e19670adb07f82b092",
            "@context": [
              "schema#f6ab05cd-95a6-4465-8b3a-e1e87375fef9"
            ],
            "id": "did:hedera:testnet:7Vn2KdgTZG2DZkz1x3naEJfazEACCEZGBkGLeUwrh45C_0.0.3075949",
            "type": "f6ab05cd-95a6-4465-8b3a-e1e87375fef9"
          }
        ],
        "proof": {
          "type": "Ed25519Signature2018",
          "created": "2023-02-01T06:35:57Z",
          "verificationMethod": "did:hedera:testnet:7Vn2KdgTZG2DZkz1x3naEJfazEACCEZGBkGLeUwrh45C_0.0.3075949#did-root-key",
          "proofPurpose": "assertionMethod",
          "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..XUDlrhjJkXHgOIKVdGZETi3koGVRJM2elk70XKzRmCxVL8OyMEfhVyEz9c2z4L7I00dlH0nrZKoirtOdp0puAA"
        }
      },
      "createDate": "2023-02-01T06:35:57.508Z",
      "updateDate": "2023-02-01T06:35:57.508Z",
"created": "2023-02-01T06:35:57.508Z",
      "updated": "2023-02-01T06:35:57.508Z",
      "status": "NEW",
      "signature": 0,
      "type": "registrant",
      "policyId": "63da04e19670adb07f82b092",
      "tag": "create_application(db)",
      "messageId": "1675.233357483",
      "topicId": "0.0.1675233357271",
      "relationships": null,
"option": {
        "status": "Waiting for approval"
      },
      "comment": null,
      "assignedTo": null,
      "assignedToGroup": null,
      "hederaStatus": "ISSUE",
      "schema": "#f6ab05cd-95a6-4465-8b3a-e1e87375fef9",
      "accounts": {
        "default": "0.0.1675233350065"
      },
      "tokens": null,
      "uuid": "801f790a-404c-4869-ae1b-4e5fe1146783",
      "entity": "NONE",
      "iri": "801f790a-404c-4869-ae1b-4e5fe1146783",
      "readonly": false,
      "system": false,
      "active": false,
      "codeVersion": "1.0.0",
      "group": "8e58d3eb-9af5-4705-a9b3-
.....
```
{% endswagger-response %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="/policies/{policyId}/blocks/{uuid}" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="body" name="orderDirection" type="String" required="false" %}
Order Direction ASC,DESC
{% endswagger-parameter %}

{% swagger-parameter in="body" name="orderField" type="String" required="false" %}
Order Field Path
{% endswagger-parameter %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}
{% endswagger %}
