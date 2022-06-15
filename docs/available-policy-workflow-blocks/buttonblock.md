# Button Block

### Properties

| Block Property   | Definition                                                                        | Example Input                                                                         | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | approve\__reject\_btn_                                                                |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | VVB                                                                                   |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                 |        |
| On errors        | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                 |        |

### Button

| Block Property     | Definition                                                                                       | Example Input                                                                                                             | Status |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| Type               | Type of the Button                                                                               | <p>Two types of buttons:<br>1. Selector : Simply button. 2. Selector - dialog : button with dialog</p>                    |        |
| Button Tag         | Tag of the button will be chosen in events tab                                                   | Button\_0                                                                                                                 |        |
| Dialog Title       | pop - up dialog title. this field gets enabled when button type is Selector-dialog               | Reject                                                                                                                    |        |
| Dialog Description | It is the text inside dialog pop up. This field is enabled when button type is Selector - dialog | Enter reject reason                                                                                                       |        |
| Button Name        | Label of the button                                                                              | Validate                                                                                                                  |        |
| Field              | Field of document to change                                                                      | option.status                                                                                                             |        |
| Value              | Value to set                                                                                     | Validated                                                                                                                 |        |
| UI Class           | UI class of the button                                                                           | btn-approve                                                                                                               |        |
| Filters            | array of addition visible filters                                                                | <p>Field (field) – field of document.</p><p>Value (value) – field to compare.</p><p> Type (type)– type of comparison.</p> |        |
