# Policy Workflow Step 19

After we added the “standard\_registry\_header”, we add another container block by clicking on the Container button in the top navigation bar.

We then fill in the fields as we did for the installer, except now the permission is for the Standard Registry.

![](../.gitbook/assets/PW\_24.png)

**Programmatically this workflow step looks like this:**

```
    // Page containing the list of installers which sent documents for approval.
    {
      "tag": "approve_page",
      "defaultActive": true,
      "permissions": [
        "OWNER"
      ],
      "blockType": "InterfaceContainerBlock",
      "uiMetaData": {
        "type": "blank",
        "title": "Approve Documents"
      },
```
