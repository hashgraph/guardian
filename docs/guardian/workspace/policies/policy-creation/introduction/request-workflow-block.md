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
| presetSchema     | Schema of the preset document. Technically, it's the uuid of the schema.                                                                                    | #de62118a-d746-4c9f-ba1a-2278b13a2137                                           |
| presetFields     | Mappings from fields of the preset schema to fields of the form, see "Preset fields" below.                                                                  | `[{"name": "field0", "title": "Project Details", "value": "field0", "readonly": false}]` |

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

### Preset fields

A preset fills the form with values from an existing document (the document the block is bound to, for example the row of a document source it was opened from). It works the same way in the requestVCDocumentBlock and in the requestVcDocumentBlockAddon.

Each item of _presetFields_ maps one field of the block schema to one field of the preset schema:

| Key                 | Description                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| name                | Field of the block schema that is filled.                                                                    |
| value               | Field of the preset schema the value is taken from. Also `username` and `hederaAccountId`.                   |
| title               | Field title, for display.                                                                                    |
| readonly            | If true, the user can not change the value, and the server rejects a changed one.                            |
| nameLevel/valueLevel| Number of arrays on the `name` and `value` paths. Stored only for nested mappings.                           |

#### Nested paths and arrays

`name` and `value` can be dotted paths (`parent.child.field`) to reach fields of sub-schemas. Plain names work exactly as before, so existing policies need no change.

Arrays on a path are implicit: a path that crosses an array reads and writes one value per entry, and the result is a nested array, the same convention as the Math block. For example, `places.title` with `places` an array gives `["A", "B"]`.

The source and the target can have a different number of arrays:

* The same number: values are copied entry by entry (`[].title` to `[].name`).
* The source is deeper: the outer levels are merged and the innermost grouping is kept (`[][].tag` to `[].tag`).
* The source has fewer arrays than the target: not allowed, the editor does not offer such sources.
* The target has no arrays and the source has some: not allowed either, a single value can not take a list.

A mapping that breaks these rules is skipped when the form is filled and when the readonly check runs.

#### Readonly fields and conditions

A readonly mapping is checked on the server when the document is submitted. The submitted value must equal the value of the preset document the request refers to (the form always sends it). A request that does not send a reference to the preset document is not checked.

* A field that is hidden by a schema condition (for example `hasProjectLocations` is false) is not part of the document, so it does not fail the check.
* A field that is visible but missing, null or different from the preset is rejected with `Readonly preset field (name) can not be modified.`
* Only the data is compared. The `type` and `@context` that the platform adds to sub-schema objects are ignored.

#### Configuring in the editor

In the block settings, select the **Preset Schema**. Fields of the block schema with the same title are mapped automatically. Use the trash button to remove the preset schema and all mappings.

* Each row is a mapped field of this form: pick the source field in the dropdown, and use the lock to make it readonly. The path of the field is shown under its title.
* Rows are listed in the order of the `presetFields` JSON, and a field you have just added but not mapped yet is shown last. Fields of the form that are not mapped are not listed, they are offered in **Add new field**. Old entries without a source are left out of the saved JSON the next time you change a mapping.
* Use **Add new field** to pre-fill another field of the form, root or nested. First choose the field of this form to fill, then pick the preset field its value comes from.
* The cross button removes the field from the preset.
* If the type of the source does not fit the field (for example an object into a text field), the row shows a **type mismatch** warning and the source is marked in the dropdown. The mapping can still be saved, but the value will not be filled in correctly, so use fields of the same type. A readonly mapping with a type mismatch can block the user from submitting the form.

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
