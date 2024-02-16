# Policy Workflow Step 22

Next, we return to the top field in our policy to add our final policy action block – minting of tokens – by clicking on the “Container” button in the top navigation bar.

![](../.gitbook/assets/PW\_image\_29.png)

**Programmatically this workflow step looks like this:**

```
// Policy branch for minting tokens.
{
  "tag": "mint_events",
  "permissions": [
    "OWNER",
    "INSTALLER"
  ],
  "blockType": "InterfaceContainerBlock",
  "uiMetaData": {
    "type": "blank"
  },
```
