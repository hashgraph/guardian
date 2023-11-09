# notificationBlock

This Block is used to generate Notifications.

<figure><img src="../../../../.gitbook/assets/image (7) (4).png" alt=""><figcaption></figcaption></figure>

## 1.1 Properties

| Property Name               | Description                                                                                           | Example                                                                      | Status |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| Tag                         | Unique name for the logic block.                                                                      | notificationBlock                                                            |        |
| Permissions                 | Which entity has rights to interact at this part of the workflow.                                     | Standard Registry                                                            |        |
| Default Active              | Shows whether this block is active at this time and whether it needs to be shown.                     | Checked or Unchecked                                                         |        |
| Stop Propagation            | End processing here, don't pass control to the next block.                                            | Checked or Unchecked                                                         |        |
| On Errors                   | Called if the system error has occurs in the Block                                                    | <p>- No action<br>- Retry</p>                                                |        |
| Title                       | .Notification title                                                                                   | Schema Creation                                                              |        |
| Type                        | type of notification                                                                                  | ERROR, SUCCESS, INFO, WARN                                                   |        |
| Message                     | Notification message                                                                                  | Schema is created                                                            |        |
| Link notification to policy | If checked : policy will be opened by clicking on notification                                        | Checked or Unchecked                                                         |        |
| User                        | If User == “ROLE”, users can setup appropriate role and also mark it as “Only for current user group” | ALL,CURRENT,POLICY\_OWNER,DOCUMENT\_OWNER,DOCUMENT\_ISSUER,GROUP\_OWNER,ROLE |        |
