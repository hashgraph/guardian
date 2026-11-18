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

## Preset fields

A preset fills the form with values from an existing document (the document the button was pressed on). It works the same way in the requestVcDocumentBlock and in this addon.

Each item of _presetFields_ maps one field of the block schema to one field of the preset schema:

| Key                 | Description                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| name                | Field of the block schema that is filled.                                                                    |
| value               | Field of the preset schema the value is taken from. Also `username` and `hederaAccountId`.                   |
| title               | Field title, for display.                                                                                    |
| readonly            | If true, the user can not change the value, and the server rejects a changed one.                            |
| nameLevel/valueLevel| Number of arrays on the `name` and `value` paths. Stored only for nested mappings.                           |

### Nested paths and arrays

`name` and `value` can be dotted paths (`parent.child.field`) to reach fields of sub-schemas. Plain names work exactly as before, so existing policies need no change.

Arrays on a path are implicit: a path that crosses an array reads and writes one value per entry, and the result is a nested array, the same convention as the Math block. For example, `places.title` with `places` an array gives `["A", "B"]`.

The source and the target can have a different number of arrays:

* The same number: values are copied entry by entry (`[].title` to `[].name`).
* The source is deeper: the outer levels are merged and the innermost grouping is kept (`[][].tag` to `[].tag`).
* The source has fewer arrays than the target: not allowed, the editor does not offer such sources.
* The target has no arrays and the source has some: not allowed either, a single value can not take a list.

A mapping that breaks these rules is skipped when the form is filled and when the readonly check runs.

### Readonly fields and conditions

A readonly mapping is checked on the server when the document is submitted. The submitted value must equal the value of the preset document the request refers to (the form always sends it). A request that does not send a reference to the preset document is not checked.

* A field that is hidden by a schema condition (for example `hasProjectLocations` is false) is not part of the document, so it does not fail the check.
* A field that is visible but missing, null or different from the preset is rejected with `Readonly preset field (name) can not be modified.`
* Only the data is compared. The `type` and `@context` that the platform adds to sub-schema objects are ignored.

### Configuring in the editor

In the block settings, select the **Preset Schema**. Fields of the block schema with the same title are mapped automatically. Use the trash button to remove the preset schema and all mappings.

* Each row is a mapped field of this form: pick the source field in the dropdown, and use the lock to make it readonly. The path of the field is shown under its title.
* Rows are listed in the order of the `presetFields` JSON, and a field you have just added but not mapped yet is shown last. Fields of the form that are not mapped are not listed, they are offered in **Add new field**. Old entries without a source are left out of the saved JSON the next time you change a mapping.
* Use **Add new field** to pre-fill another field of the form, root or nested. First choose the field of this form to fill, then pick the preset field its value comes from.
* The cross button removes the field from the preset.
* If the type of the source does not fit the field (for example an object into a text field), the row shows a **type mismatch** warning and the source is marked in the dropdown. The mapping can still be saved, but the value will not be filled in correctly, so use fields of the same type. A readonly mapping with a type mismatch can block the user from submitting the form.

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
