# Tips and Troubleshooting

* Save the public link and the generated access key in a local file before moving on. You will need both when importing the key into the remote user.
* If nothing seems to happen after an action, check the Incoming Requests screen. A pending, unapproved request blocks the next step of the workflow.
* Give each action time to process. **Actions** move from **New** to **Completed** as the event is synchronized; operating before processing finishes is the most common source of confusion.
* Remember the approval chain: the policy must be published as Public, the dependent standard registry must approve the imported policy, and each workflow action must be approved in Incoming Requests by the user sending the operation.
* Verify the remote user after creating it. Its Hedera account ID, user topic, and DID must match the dependent user's profile exactly.
