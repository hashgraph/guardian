# Events

There is a new tab called ‘Events’ for every block in the GUI where events can be configured. The events allow Policy creators to transfer control/execution on exit from the current block to an arbitrary block and thus build non-linear workflows.

![](../.gitbook/assets/Events\_1.png)

### Settings:

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                          | Description                                                                                                                     |
| ------------- | ------------ | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | -                                      | Type of the event - determines whether this is ingress or egress event for the current block.                                   |
| Source        | "source"     | Block tag(string)                                                 | "block\_tag"                           | The block which initiates the event.                                                                                            |
| Target        | "target"     | Block tag(string)                                                 | "block\_tag"                           | The block which receives the event.                                                                                             |
| Output Event  | "output"     | Event name(string)                                                | "event\_name"                          | Action or issue that caused the event.                                                                                          |
| Input Event   | "input"      | Event name(string)                                                | "event\_name"                          | Action which will be triggered by the event.                                                                                    |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | <p>""</p><p>"owner"</p><p>"issuer"</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |
| Disabled      | "disabled"   | True/False                                                        | true/false                             | Allows to disable the event without deleting it.                                                                                |



![](../.gitbook/assets/Events\_1.png)

![](../.gitbook/assets/Events\_2.png)

{% hint style="info" %}
Note: The event is shown in both source and target blocks tabs regardless of where it was added initially.
{% endhint %}

### Default Events

Default events correspond to the implicit default transfer of execution control from the current to the next (adjacent) block graphically represented by the block immediately below the current one.

Default events can be switched off by setting ‘Disabled’ to ‘true’ on the Events tab, or ‘Stop Propagation’ to ‘true’ on the Properties tab as in the older Guardian versions.

![](../.gitbook/assets/Events\_3.png)

### Output Events

Output events are events which are created by the ‘Source’ blocks.

**Output Event (enum):**

**All Blocks:**

* RunEvent - appears upon the completion of main logic of the block.
* RefreshEvent - triggered upon the changes in the state of the block.

![](../.gitbook/assets/Events\_9.png)

**TimerBlock:**

* TimerEvent – triggered upon each ‘tick’ of the timer

**switchBlock:**

* Condition 1..N - each condition expression in the switch block maps to the corresponding event created upon the evaluation of its condition into ‘true’

![](../.gitbook/assets/Events\_11.png)

**InterfaceActionBlock:**

* Option 1..N - each Option (button) triggers a corresponding event upon the button press action from the user

![](../.gitbook/assets/Events\_10.png)

#### Calculate Block, Custom Logic Block, DocumentValidatorBlock, ExternalDataBlock, MintBlock, Reassigning Block, RequestVcDocumentBlock, RetirementBlock, RevokeBlock, SendToGuardianBlock, TokenActionBlock, TokenConfirmationBlock

* Error Event : Which is called and passed the input data when error occur.

### Input Events

Input Events are received and processed by the egress interface of the ‘Target’ block.

**Input Event (enum):**

**All Blocks:**

* RunEvent - triggers the execution of the main logic of the block.
* RefreshEvent - triggers the refresh of the block (in the UI it re-draws the component)

**aggregateDocumentBlock:**

* TimerEvent - triggers the execution of the time(period)-activated aggregation logic, and passes the aggregated data further
* PopEvent - removes the document from the aggregation.&#x20;

![](../.gitbook/assets/Events\_12.png)

**timerBlock:**

* StartTimerEvent - starts the timer for the user (to ‘tick’ for the time-activated aggregation logic)
* StopTimerEvent – stops the ‘ticking’ timer for the user

#### RequestVcDocumentBlock:

* RestoreEvent - Which receive input vc document to restore data.

#### mintDocumentBlock:

* AdditionalMintEvent - allows linking of the result of one mint block with another mint block.

{% hint style="info" %}
**Note:**

1. The link starts with “RunEvent” of the main Mint Block and ends with “AdditionalMintEvent” of the secondary Mint Block
2. “Default Event” of the main Mint Block must be switched off if linked Mint Blocks follow each other
{% endhint %}

### Event Actor

Allows to change the user-context of the execution

_For example_: in the situation where the Standard Registry confirms the form data from the user and the Policy author would like to come back to the execution of the StepBlock as the original user the ‘Document Owner’ should be configured here instead of the ‘Event Initiator’.

* Event Initiator - Actor which triggered the event.
* Document Owner- Actor is changed to the owner of the document.
* Document Issuer - Actor is changed to the user who signed (confirmed) the document.

### Viewer

#### Output events

![](../.gitbook/assets/Events\_4.png)

#### Input events

![](../.gitbook/assets/Events\_5.png)

#### Default Events

![](../.gitbook/assets/Events\_6.png)

#### Tooltips

![](../.gitbook/assets/Events\_7.png)

#### Filters

![](../.gitbook/assets/Events\_8.png)
