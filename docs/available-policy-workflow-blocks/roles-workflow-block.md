# Roles Workflow Block

#### Available Container Workflow Block Properties

| Block Property | Definition                                                                        | Example Input                                   |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| Type           | A block which determines a role for the user.                                     | policyRolesBlock (Can't be changed).            |
| Tag            | Unique name for the logic block.                                                  | choose\_role.                                   |
| Permissions    | Which entity has rights to interact at this part of the workflow.                 | Installer.                                      |
| Default Active | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                           |
| Dependancies   | Establish workflow dependancies that need to be completed prior.                  | Select the apprioriate block from the dropdown. |
| Roles          | Available roles from which the user can choose.                                   | Select the apprioriate roles from the dropdown. |

#### Available Roles Workflow Block UI Properties

| UI Property | Definition                                   |
| ----------- | -------------------------------------------- |
| Title       | Provide the a title for the role selector.   |
| Description | Provide a description on the role selection. |
