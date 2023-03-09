# InterfaceDocumentsSourceBlock

### Properties

| Block Property | Definition                                                                                             | Example Input                                                        | Status                                     |
| -------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| type           | A block type which outputs information from the DB as grid.                                            | **InterfaceDocumentsSource** Block (Can't be changed).               |                                            |
| tag            | Unique name for the logic block.                                                                       | sensors\_grid.                                                       |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                                      | Installer.                                                           |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown.                      | Checked or unchecked.                                                |                                            |
| dependencies   | Automatic update. The block is automatically re-rendered if any of the linked components gets updated. | Select the appropriate block from the dropdown.                      | <mark style="color:red;">Deprecated</mark> |
| dataType       | Specify the table to request the data from.                                                            | Current options are: Verifiable Credential, DID, Approve, or Hedera. |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property           | Definition                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                 | Type of the displayed value, possible options. Current options are: TEXT (ordinary text), BUTTON (a button), or BLOCK (a block embedded into the column).                                                                                                                                                                                                        |
| Enable common sorting | <p></p><ol><li>When it is true, user can sort grid data on UI side, or make POST request to interfaceSourceBlock with body ({ orderField: 'option.status', orderDirection: 'asc'}) to change sorting through the API</li><li>When it is false, user can set order to specific documentSourceAddon block by POST request with same body through the API</li></ol> |
| Field Name            | Object fields to retrieve the values from. Internal fields are separated by ".", access to array elements is via index. This is the field name.                                                                                                                                                                                                                  |
| Field Type            | Current Options: TEXT, BUTTON, AND BLOCK.                                                                                                                                                                                                                                                                                                                        |
| Field Title           | Title of the column.                                                                                                                                                                                                                                                                                                                                             |
| Field Tooltip         | Provide a tooltip for the field.                                                                                                                                                                                                                                                                                                                                 |
| Field Cell Content    | Content inside the cell.                                                                                                                                                                                                                                                                                                                                         |
| Field UI Class        | Arbitrary Class                                                                                                                                                                                                                                                                                                                                                  |
| Width                 | For example : 100px                                                                                                                                                                                                                                                                                                                                              |
| Bind Group            | If interfaceDocumentsSourceBlock has more than one documentsSourceAddon, then you can create different columns for each (names must be the same)                                                                                                                                                                                                                 |
| Bind Block            | Specifying a "bindBlock" field would result in the display of the linked block in side the dialog.. Needs for the field type to be a BLOCK or BUTTON with the Action type as DIALOGUE.                                                                                                                                                                           |
| Action                | Needs for the field type to be a BUTTON. Specifies what action will happen when the button is clicked. Action options are currently: LINK to a URL or prompt a DIALOGUE box.                                                                                                                                                                                     |
| Dialogue Type         | Currently only json type is supported. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                                                                                                                                                                                                        |
| Dialogue Content      | Provide content for the dialogue box. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                                                                                                                                                                                                         |
| Dialogue Class        | Dialog style. Needs for the field type to be a BUTTON and Action to be DIALOGUE.                                                                                                                                                                                                                                                                                 |

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

To know more information about events, please look at [events.md](events.md "mention").

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

{% swagger-parameter in="body" name="orderDirection" type="String" %}
Order Direction ASC,DESC
{% endswagger-parameter %}

{% swagger-parameter in="body" name="orderField" type="String" %}
Order Field Path
{% endswagger-parameter %}

{% swagger-parameter in="path" name="policyId" type="String" required="true" %}
Policy ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uuid" type="String" required="true" %}
Block UUID
{% endswagger-parameter %}
{% endswagger %}
