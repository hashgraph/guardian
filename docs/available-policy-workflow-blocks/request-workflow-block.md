# Request Workflow Block

### Properties

| Block Property   | Definition                                                                                                                                                   | Example Input                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Type             | A type of the block which creates a form from the schema, and sends the document to the server.                                                              | **request**VCDocumentBlock (Can't be changed).                                                                               |
| Tag              | Unique name for the logic block.                                                                                                                             | add\_new\_installer\_request.                                                                                                |
| Permissions      | Which entity has rights to interact at this part of the workflow.                                                                                            | Root Authority.                                                                                                              |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown.                                                                            | Checked or unchecked.                                                                                                        |
| Dependancies     | Establish workflow dependancies that need to be completed prior.                                                                                             | Select the appropriate block from the dropdown.                                                                              |
| Schema           | Pre-configured schemas for the document relevant for policy action requests. Technically, it's the uuid of the schema, which will be used to build the form. | IRec-Application-Details (to be selected from the drop down of available schemas in your Guardian instance).                 |
| ID Type          | Select the type of ID that is populated in the ID field of the Verifiable Credential document.                                                               | Current Options are: DID (creates a new DID), UUID (creates a new UUID), and Owner (which uses the DID of the current user). |
| Stop Propagation | End processing here, don't pass control to the next block.                                                                                                   | Checked or Unchecked.                                                                                                        |

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
