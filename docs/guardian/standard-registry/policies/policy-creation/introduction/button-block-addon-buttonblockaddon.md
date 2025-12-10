# Button Block Addon (buttonBlockAddon)

The purpose of this block is to display interactive buttons in documents source block (interfaceDocumentsSourceBlock).

## Usage

As shown in the example below, buttonBlockAddon blocks should be placed inside interfaceDocumentsSourceBlock blocks.

<figure><img src="../../../../../.gitbook/assets/image (677).png" alt=""><figcaption></figcaption></figure>

## Properties

<table><thead><tr><th>Property Name</th><th>Description</th><th width="243">Example</th><th>Status</th></tr></thead><tbody><tr><td>Button Name (<em>name</em>)</td><td>The label (name) of the button as displayed to the user</td><td>"Approve", "Reject"</td><td></td></tr><tr><td>UI Class (<em>uiClass</em>)</td><td>The UI class of the button</td><td>“btn-approve”, “btn-reject”, “btn-link”</td><td></td></tr><tr><td>hideWhenDiscontinued</td><td>Check if the button should be hidden when policy is discontinued</td><td>Checked/Unchecked</td><td></td></tr><tr><td>Dialog (<em>dialog)</em></td><td>Determines if a dialog should be opened after the button is clicked</td><td>true, false.</td><td></td></tr><tr><td>Dialog Options (<em>dialogOptions</em>)</td><td>Will be shown only if the Dialog setting is set to true.</td><td><ol start="1"><li>Dialog Title (<em>dialogOptions.dialogTitle</em>): The title of the dialog. Example: “Rejection”.</li><li>Dialog Description (<em>dialogOptions.dialogDescription</em>): The description of the dialog. Example: “Enter reject reason”.</li><li>Dialog Result Field Path (<em>dialogOptions.dialogResultFieldPath</em>): The field which will contain the result value from the dialog. Example: “option.comment”.</li></ol></td><td></td></tr></tbody></table>

<figure><img src="../../../../../.gitbook/assets/image (678).png" alt=""><figcaption></figcaption></figure>

## Events

Button block addon events will be automatically added to document source.

<figure><img src="../../../../../.gitbook/assets/image (679).png" alt=""><figcaption></figcaption></figure>

## API

The API for the buttonBlockAddon features both GET and POST methods:

1. Example response to the GET request:

```
{
    "id": "4e43f63f-f2e9-4336-a69e-931ec4aafaee",
    "blockType": "buttonBlockAddon",
    "dialog": true,
    "dialogOptions": {
        "dialogTitle": "Reject",
        "dialogDescription": "Enter reject reason",
        "dialogResultFieldPath": "option.comment"
    },
    "name": "Reject",
    "uiClass": "btn-reject",
}

```

The response to the GET request includes all block settings.

2. Example payload for the POST request:

```
{
  "documentId": "66b2838927c34db3c18e3c49",
  "dialogResult": "Typo in name"
}

```

Where

documentId - selected document identifier.

dialogResult is used for the dialog only.
