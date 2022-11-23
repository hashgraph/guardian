# Create Token Block

## Properties

| Block Property   | Definition                                                                                      | Example Input                              | Status |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| type             | A type of the block which creates a form from the schema, and sends the document to the server. | **Create Token** Block (Can't be changed). |        |
| tag              | Unique name for the logic block.                                                                | add\_new\_installer\_request.              |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                               | Standard Registry.                         |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.               | Checked or unchecked.                      |        |
| stop propagation | End processing here, don't pass control to the next block.                                      | Checked or Unchecked.                      |        |
| Token Template   | We can set template by which we want to create token                                            | token\_template_\__0                       |        |

## UI Properties

| UI Property          | Definition                                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type                 | Style of the render of the form. It can be either a Page (the form is rendered as a page) or Dialogue (displays a button, which opens a dialogue with the form when clicked). |
| Title                | Provides the Page or Dialogue box a title.                                                                                                                                    |
| Description          | Provides the Page or Dialogue box a description.                                                                                                                              |
| Button Content       | Text to fill inside a button. Needs the Dialogue box to be selected from the "Type."                                                                                          |
| Dialogue Text        | Provides a tile inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                               |
| Dialogue Description | Provides a description inside the Dialogue box. Needs the dialogue box to be selected from the "Type."                                                                        |

