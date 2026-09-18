# Request Vc Document Block Addon (requestVcDocumentBlockAddon)

The purpose of this block is to display an interactive button in the interfaceDocumentsSourceBlock.

## Usage

As shown in the example below, requestVcDocumentBlockAddon blocks should be placed inside interfaceDocumentsSourceBlock blocks.

<figure><img src="../../../../../.gitbook/assets/image (683).png" alt=""><figcaption></figcaption></figure>

## Properties

| Property Name                  | Description                                                      | Example                                                                                                                                     | Status |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Button Name (_buttonName_)     | The label (name) of the button as displayed to the user.         | Add report                                                                                                                                  |        |
| UI Class (_uiClass_)           | The UI class of the button.                                      | "btn-approve”, “btn-reject”, “btn-link                                                                                                      |        |
| hideWhenDiscontinued           | Check if the button should be hidden when policy is discontinued | Checked/Unchecked                                                                                                                           |        |
| Dialog Title (_dialogTitle_)   | The title of the dialog.                                         | Add report                                                                                                                                  |        |
| Schema (_schema_)              | Schema which will be used for document creation.                 | #de62118a-d746-4c9f-ba1a-2278b13a2137                                                                                                       |        |
| Id Type (_idTypev)_            | Type of identifier in document which will be created.            | “UUID”, “DID”, “OWNER”                                                                                                                      |        |
| Preset (_preset_)              | Will selected document be used as preset.                        | true, false                                                                                                                                 |        |
| Preset Schema (_presetSchema_) | Schema which will be used as a preset schema.                    | #de62118a-d746-4c9f-ba1a-2278b13a2137                                                                                                       |        |
| Preset Fields (_presetFields_) | Preset fields configuration.                                     | <p>[</p><p>{</p><p>"name": "field0",</p><p>"title": "Project Details",</p><p>"value": "field0",</p><p>"readonly": false</p><p>}</p><p>]</p> |        |

<figure><img src="../../../../../.gitbook/assets/image (684).png" alt=""><figcaption></figcaption></figure>

## Events

Request VC document block addon events will be automatically added to document source.

<figure><img src="../../../../../.gitbook/assets/image (685).png" alt=""><figcaption></figcaption></figure>

## API

The API for the dropdownBlockAddon has both GET and POST methods:

1\. Example response to the GET request:

```
{
  "id": "20639b5d-c43d-4aa0-a1d1-d0ac36e867de",
  "blockType": "requestVcDocumentBlockAddon",
  "buttonName": "Add Report",
  "uiClass": "link",
  "dialogTitle": "Add Report",
  "presetFields": [
    {
      "name": "field0",
      "title": "Project Details",
      "value": "field0",
      "readonly": false
    },
	...
  ],
  "schema": {
    ...
  },
  "idType": "UUID",
  "preset": true,
  "presetSchema": "#de62118a-d746-4c9f-ba1a-2278b13a2137",
}

```

A response to the GET request includes all block settings and:

● schema - Schema document

2. Example payload for the POST request:

```

 	  "document": {
    "field0": "Device",
    "field1": "Organization",
    ...
  },
  "ref": "66ba0cad0edaef237a78b44b"
}

```

● document - Credential subject

● ref - Reference document identifier
