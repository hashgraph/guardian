# Step Workflow Block

### Properties

| Block Property | Definition                                                                                                      | Example Input                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type           | Similar to the **InterfaceContainer**Block, with the difference that it can only render a single child element. | **InterfaceStep**Block (Can't be changed).      |
| Tag            | Unique name for the logic block.                                                                                | CSD01 Document.                                 |
| Permissions    | Which entity has rights to interact at this part of the workflow.                                               | Root Authority.                                 |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown.                               | Checked or unchecked.                           |
| Dependancies   | Establish workflow dependancies that need to be completed prior.                                                | Select the appropriate block from the dropdown. |
| Cyclic         | Go back one step to enable the creation of the previous object.                                                 | Checked or unchecked.                           |

### UI Properties

| UI Property | Definition                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Type BLANK  | Does not contain any frame, will render all child elements one after the other.                                    |
| Type TABS   | A container which has a tab for each of the child element. It will render the first child element as type "blank". |
