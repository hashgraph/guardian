# Policy Workflow Step 17

Next, we need to add an information block to our policy to specify what happens if the application is rejected by clicking on the information button in the top navigation bar.

We then name the block through the tag, set permissions, activate by default such that rejection notifications are caught, stop the process if received, and then name the notification and define the message.

![](https://i.imgur.com/NO03gnI.png)

**Programmatically this workflow step looks like this:**

```
    // Block to display rejection info (i.e. the INSTALLER was not approved by RootAuthority).
    {
      "tag": "installer_rejected",
      "blockType": "informationBlock",
      "children": [],
      "uiMetaData": {
        "type": "text",
        "description": "Your application was rejected",
        "title": "Rejected"
      },
      "stopPropagation": true,
      "permissions": [
        "INSTALLER"
      ],
      "defaultActive": true
    }
  ]
},
```

This completes the installer steps of the policy.
