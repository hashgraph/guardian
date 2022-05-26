# requestVCDocumentBlock

### Properties

| Block Property   | Definition                                                                                                                                                   | Example Input                                                                                                                | Status                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| type             | A type of the block which creates a form from the schema, and sends the document to the server.                                                              | **requestVCDocument**Block (Can't be changed).                                                                               |                                            |
| tag              | Unique name for the logic block.                                                                                                                             | add\_new\_installer\_request.                                                                                                |                                            |
| permissions      | Which entity has rights to interact at this part of the workflow.                                                                                            | Root Authority.                                                                                                              |                                            |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.                                                                            | Checked or unchecked.                                                                                                        |                                            |
| dependencies     | Establish workflow dependancies that need to be completed prior.                                                                                             | Select the appropriate block from the dropdown.                                                                              | <mark style="color:red;">Deprecated</mark> |
| schema           | Pre-configured schemas for the document relevant for policy action requests. Technically, it's the uuid of the schema, which will be used to build the form. | IRec-Application-Details (to be selected from the drop down of available schemas in your Guardian instance).                 |                                            |
| ID Type          | Select the type of ID that is populated in the ID field of the Verifiable Credential document.                                                               | Current Options are: DID (creates a new DID), UUID (creates a new UUID), and Owner (which uses the DID of the current user). |                                            |
| stop propagation | End processing here, don't pass control to the next block.                                                                                                   | Checked or Unchecked.                                                                                                        |                                            |

{% hint style="info" %}
RefreshEvents are used to refreshing the UI, instead of "dependencies" property.
{% endhint %}

### UI Properties

| UI Property          | Definition                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                 | Style of the render of the form. It can be either a Page (the form is rendered as a page) or Dialogue (displays a button, which opens a dialogue with the form when clicked). |
| Title                | Provides the Page or Dialogue box a title.                                                                                                                                    |
| Description          | Provides the Page or Dialogue box a description.                                                                                                                              |
| Button Content       | Text to fill inside a button. Needs the Dialogue box to be selected from the "Type."                                                                                          |
| Dialogue Text        | Provides a tile inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                               |
| Dialogue Description | Provides a description inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                        |
| Dialogue Class       | Need to fill out.                                                                                                                                                             |
| Fields               | Need to fill out.                                                                                                                                                             |

### Events

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                                                                                                                   | Description |
| ------------- | ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | Type of the event - determines whether this is ingress or egress event for the current block.                                   |             |
| Source        | "source"     | Block tag(string)                                                 | The block which initiates the event.                                                                                            |             |
| Target        | "target"     | Block tag(string)                                                 | The block which receives the event.                                                                                             |             |
| Output Event  | "output"     | Event name(string)                                                | Action or issue that caused the event.                                                                                          |             |
| Input Event   | "input"      | Event name(string)                                                | Action which will be triggered by the event.                                                                                    |             |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |             |
| Disabled      | "disabled"   | True/False                                                        | Allows to disable the event without deleting it.                                                                                |             |

To know more information about events, please look at [events.md](events.md "mention").

### API Parameters

{% swagger method="get" path="" baseUrl="blockType: 'requestVcDocument'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="id" type="String" required="true" %}
Block ID
{% endswagger-parameter %}

{% swagger-parameter in="path" name="blocktype" type="String" required="true" %}
Type of Block
{% endswagger-parameter %}

{% swagger-parameter in="path" name="schema" type="Object" required="true" %}
Schema Description
{% endswagger-parameter %}

{% swagger-parameter in="path" name="uiMetaData" required="true" %}
{}
{% endswagger-parameter %}
{% endswagger %}

{% swagger method="post" path="" baseUrl="blockType: 'requestVcDocument'" summary="" %}
{% swagger-description %}

{% endswagger-description %}

{% swagger-parameter in="path" name="document" type="VC" required="true" %}
VC Document
{% endswagger-parameter %}

{% swagger-parameter in="path" name="ref" type="String" %}
ID of linked VC
{% endswagger-parameter %}
{% endswagger %}
