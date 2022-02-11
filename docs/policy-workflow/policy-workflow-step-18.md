# Policy Workflow Step 18



Next, we add a sequence of policy action steps for the RootAuthority. We do this by first clicking on the top policy field, and then we add a container for all the RootAuthority policy action steps by clicking on the Container button in the top navigation bar.

![](https://i.imgur.com/Wm4dpIn.png)

**Programmatically this workflow step looks like this:**

```
// This Policy branch is used by users with the RootAuthority roles.
//Starting with the ContainerBlock.
{
  "tag": "root_authority_header",
  "defaultActive": true,
  "permissions": [
    "OWNER"
  ],
  "blockType": "interfaceContainerBlock",
  "uiMetaData": {
    "type": "tabs"
  },
```
