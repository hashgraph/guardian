# reportBlock & reportItemBlock

## reportBlock

### 1. Properties

| Block Property | Definition                                                                        | Example Input                                   | Status                                     |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| type           | Type of workflow logic                                                            | **report**Block(Can't be changed).              |                                            |
| tag            | Unique name for the logic block.                                                  | report.                                         |                                            |
| permissions    | Which entity has rights to interact at this part of the workflow.                 | Standard Registry.                              |                                            |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |                                            |
| dependencies   | Establish workflow dependancies that need to be completed prior.                  | Select the appropriate block from the dropdown. | <mark style="color:red;">Deprecated</mark> |

### 2. Impacts Section

We have added new Impacts Section to display Primary/Secondary Impacts token details in Trustchain:

<figure><img src="../.gitbook/assets/image (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

In the case when multiple linked mint blocks are used then the system displays all linked VPs as shown below:

<figure><img src="../.gitbook/assets/image (2) (1) (3).png" alt=""><figcaption></figcaption></figure>

#### 2.1 Data Format:

Ingress Document has following sections:

| Document Type         | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| vpDocument            | VP document found based on its hash                           |
| vcDocument            | VC document found based on its hash                           |
| impacts (new)         | array of Impacts (VCs) if exist                               |
| mintDocument          | VC document describing the mint                               |
| policyDocument        | VC document describing the policy                             |
| policyCreatorDocument | VC document describing the Standard Registry                  |
| documents             | collection of VC documents retrieved from the reportItemBlock |
| additionalDocuments   | array of VPs linked with the selected document                |

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

## reportItemBlock

### Properties

| Block Property  | Definition                                                                                                                                                                              | Example Input                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title           | Title of the element                                                                                                                                                                    | Report                                                                                                                                                                                                                                                     |
| Description     | Description of the element                                                                                                                                                              | Reporting                                                                                                                                                                                                                                                  |
| Visibility      | Visibility of the element. False if there is a need to build a chain of elements which must not be shown                                                                                | False                                                                                                                                                                                                                                                      |
| Multiple        | which allows store multiple documents in Report Item                                                                                                                                    | True                                                                                                                                                                                                                                                       |
| Filters         | Array of filters for the VC for this element                                                                                                                                            | <p>"filters": [</p><p>{</p><p>"field": "document.id", "value": "actionId", "typeValue": "variable", "type": "equal"</p><p>},</p><p>{</p><p>"typeValue": "value",</p><p>"field": "type",</p><p>"type": "equal",</p><p>"value": "report"</p><p>}</p><p>]</p> |
| Dynamic Filters | We can set “Field Path” (in current Report Item Document\[s]), “Next Item Field Path” and “Type” (Filter Type) to filter documents in Report Items dynamically directly in trust chain. | Type                                                                                                                                                                                                                                                       |
| Variables       | List of common variables. It gets filled in in the process of the transition from one reportItemBlock to the next                                                                       | <p>"variables": [</p><p>{</p><p>"value":"document.credentialSubject.0.ref",</p><p>"name": "projectId"</p><p>}</p><p>]</p>                                                                                                                                  |

A new variable projectId will be created which would be assigned the value from document.credentialSubject.0.ref.
