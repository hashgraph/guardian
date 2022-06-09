# Policy Workflow Step 18

Next, we add a sequence of policy action steps for the Standard Registry. We do this by first clicking on the top policy field, and then we add a container for all the Standard Registry policy action steps by clicking on the Container button in the top navigation bar.

![](../.gitbook/assets/PW\_23.png)

**Programmatically this workflow step looks like this:**

```
// This Policy branch is used by users with the Standard Registry roles.
//Starting with the ContainerBlock.
{
  "tag": "standard_registry_header",
  "defaultActive": true,
  "permissions": [
    "OWNER"
  ],
  "blockType": "InterfaceContainerBlock",
  "uiMetaData": {
    "type": "tabs"
  },
```
