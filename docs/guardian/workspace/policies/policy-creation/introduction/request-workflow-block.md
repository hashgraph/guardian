# requestVCDocumentBlock

### Properties

| Block Property   | Definition                                                                                                                                                   | Example Input                                                                                                                | Status |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| type             | A type of the block which receives data in the format of a ‘credential subject’ part of a VC Document                                                        | **requestVCDocumentBlock** (Can't be changed).                                                                               |        |
| tag              | Unique name for the logic block.                                                                                                                             | add\_new\_installer\_request.                                                                                                |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                                                                                            | Standard Registry.                                                                                                           |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.                                                                            | Checked or unchecked.                                                                                                        |        |
| schema           | Pre-configured schemas for the document relevant for policy action requests. Technically, it's the uuid of the schema, which will be used to build the form. | IRec-Application-Details (to be selected from the drop down of available schemas in your Guardian instance).                 |        |
| ID Type          | Select the type of ID that is populated in the ID field of the Verifiable Credential document.                                                               | Current Options are: DID (creates a new DID), UUID (creates a new UUID), and Owner (which uses the DID of the current user). |        |
| stop propagation | End processing here, don't pass control to the next block.                                                                                                   | Checked or Unchecked.                                                                                                        |        |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property          | Definition                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                 | Style of the render of the form. It can be either a Page (the form is rendered as a page) or Dialogue (displays a button, which opens a dialogue with the form when clicked). |
| Title                | Provides the Page or Dialogue box a title.                                                                                                                                    |
| Description          | Provides the Page or Dialogue box a description.                                                                                                                              |
| hideWhenDiscontinued | Check if the button should be hidden when policy is discontinued                                                                                                              |
| Button Content       | Text to fill inside a button. Needs the Dialogue box to be selected from the "Type."                                                                                          |
| Dialogue Text        | Provides a tile inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                               |
| Dialogue Description | Provides a description inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                        |

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

<mark style="color:blue;">`GET`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| uuid<mark style="color:red;">\*</mark>     | String | Block ID    |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
  "id": "ef2a7742-68d4-407f-ada7-14cdce80e24d",
  "blockType": "requestVcDocumentBlock",
  "schema": {
    "userDID": null,
    "_id": "63da04dd9670adb07f82b090",
    "id": "63da04dd9670adb07f82b090",
    "uuid": "6235abf8-6b48-4212-9ecc-c82bdf90405e",
    "hash": "",
    "name": "I-REC Facility & Device Reg",
    "description": "I-REC Facility & Device Reg",
    "entity": "VC",
    "status": "DRAFT",
    "readonly": false,
    "system": false,
    "active": false,
    "version": "",
    "creator": "did:hedera:testnet:9jShvNUsztLFbvEK442VPfkccLYW3F2oU3e6rCHzr7FT_0.0.3075949",
    "owner": "did:hedera:testnet:9jShvNUsztLFbvEK442VPfkccLYW3F2oU3e6rCHzr7FT_0.0.3075949",
    "topicId": "0.0.3120995",
    "messageId": "",
    "documentURL": "",
    "contextURL": "",
    "iri": "#6235abf8-6b48-4212-9ecc-c82bdf90405e",
    "document": {
      "$id": "#6235abf8-6b48-4212-9ecc-c82bdf90405e",
      "$comment": "{ \"@id\": \"#6235abf8-6b48-4212-9ecc-c82bdf90405e\", \"term\": \"6235abf8-6b48-4212-9ecc-c82bdf90405e\" }",
      "title": "I-REC Facility & Device Reg",
      "description": "I-REC Facility & Device Reg",
      "type": "object",
      "properties": {
        "@context": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          ],
          "readOnly": true
        },
        "id": {
          "type": "string",
          "readOnly": true
        },
        "field0": {
          "title": "Registrant Id",
          "description": "Registrant Id",
          "readOnly": false,
          "type": "string",
          "$comment": "{\"term\":\"field0\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":0}"
        },
        "policyId": {
          "title": "policyId",
          "description": "policyId",
          "readOnly": true,
          "type": "string",
          "$comment": "{\"term\":\"policyId\",\"@id\":\"https://www.schema.org/text\"}"
        },
        "ref": {
          "title": "ref",
          "description": "ref",
          "readOnly": true,
          "type": "string",
          "$comment": "{\"term\":\"ref\",\"@id\":\"https://www.schema.org/text\"}"
        },
        "field1": {
          "title": "Date",
          "description": "Date",
          "readOnly": false,
          "type": "string",
          "format": "date",
          "$comment": "{\"term\":\"field1\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":1}"
        },
        "field2": {
          "title": "Is the Registrant also the owner of the Device? (provide evidence) ",
          "description": "Is the Registrant also the owner of the Device? (provide evidence) ",
          "readOnly": false,
          "type": "string",
          "$comment": "{\"term\":\"field2\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":2}"
        },
        "field3": {
          "title": "Registrant Details",
          "description": "Registrant Details",
          "readOnly": false,
          "$ref": "#dee7e78b-44b8-4bb0-8be0-3a86bde752b2",
          "$comment": "{\"term\":\"field3\",\"@id\":\"#dee7e78b-44b8-4bb0-8be0-3a86bde752b2\",\"orderPosition\":3}"
        },
        "field4": {
          "title": "Production Device Details",
          "description": "Production Device Details",
          "readOnly": false,
          "$ref": "#b61a05c6-bb1a-4d7e-9299-c0932d8c0306",
          "$comment": "{\"term\":\"field4\",\"@id\":\"#b61a05c6-bb1a-4d7e-9299-c0932d8c0306\",\"orderPosition\":4}"
        },
        "field5": {
          "title": "Energy Sources",
          "description": "Energy Sources",
          "readOnly": false,
          "$ref": "#899e042e-dc62-4849-95dc-b982af558e6c",
          "$comment": "{\"term\":\"field5\",\"@id\":\"#899e042e-dc62-4849-95dc-b982af558e6c\",\"orderPosition\":5}"
        }
      },
      "required": [
        "@context",
        "type",
        "policyId",
        "field3",
        "field4",
        "field5"
      ],
      "additionalProperties": false,
      "$defs": {
        "#dee7e78b-44b8-4bb0-8be0-3a86bde752b2": {
          "$id": "#dee7e78b-44b8-4bb0-8be0-3a86bde752b2",
          "$comment": "{ \"@id\": \"#dee7e78b-44b8-4bb0-8be0-3a86bde752b2\", \"term\": \"dee7e78b-44b8-4bb0-8be0-3a86bde752b2\" }",
          "title": "Contact Details",
          "description": "Contact Details",
          "type": "object",
          "properties": {
            "@context": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              ],
              "readOnly": true
            },
            "type": {
              "oneOf": [
                {
                  "type": "string"
                },
                {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              ],
              "readOnly": true
            },
            "id": {
              "type": "string",
              "readOnly": true
            },
            "field0": {
              "title": "Organization Name",
              "description": "Organization Name",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field0\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":0}"
            },
            "field1": {
              "title": "Address line 1",
              "description": "Address line 1",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field1\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":1}"
            },
            "field2": {
              "title": "Address line 2",
              "description": "Address line 2",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field2\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":2}"
            },
            "field3": {
              "title": "Address line 3",
              "description": "Address line 3",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field3\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":3}"
            },
            "field4": {
              "title": "Postal code",
              "description": "Postal code",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field4\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":4}"
            },
            "field5": {
              "title": "Country",
              "description": "Country",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field5\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":5}"
            },
            "field6": {
              "title": "Contact person",
              "description": "Contact person",
              "readOnly": false,
              "type": "string",
              "$comment": "{\"term\":\"field6\",\"@id\":\"https://www.schema.org/text\",\"orderPosition\":6}"
.....
```
{% endtab %}
{% endtabs %}

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Request Body

| Name                                       | Type   | Description        |
| ------------------------------------------ | ------ | ------------------ |
| document<mark style="color:red;">\*</mark> | Object | Credential Subject |
| ref                                        | String | ID of linked VC    |
