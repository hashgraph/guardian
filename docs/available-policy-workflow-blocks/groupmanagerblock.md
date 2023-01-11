# groupManagerBlock

This block allows to manage group membership, add and remove users from the group.

### 1. Properties

| Block Property   | Definition                                                                        | Example Input                                                                               | Status |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| tag              | Unique name for the logic block.                                                  | groupManagerBlock                                                                           |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                 | NoRole                                                                                      |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.                                                                       |        |
| On errors        | Called if the system error has occurs in the Block                                | <p></p><ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul>       |        |
| Stop Propagation | End processing here, don't pass control to the next block.                        | Checked or unchecked.                                                                       |        |
| Can Invite       | specifies who can create invites                                                  | <p>· Group Owner – only the creator of the group</p><p>· All – all members of the group</p> |        |
| Can Delete       | specifies who can remove users from the group                                     | <p>· Group Owner – only the creator of the group</p><p>. All – all members of the group</p> |        |



<figure><img src="../.gitbook/assets/image (23).png" alt=""><figcaption></figcaption></figure>

### 2. Usage

#### 2.1  **List of the groups in which the user is included:**

<figure><img src="../.gitbook/assets/image (13) (4).png" alt=""><figcaption></figcaption></figure>

#### **2.2  List of the users included in the group**

<figure><img src="../.gitbook/assets/image (33).png" alt=""><figcaption></figcaption></figure>

#### **2.3  Inviting users to groups**

First step is to select the role to invite the user as shown below:

<figure><img src="../.gitbook/assets/image (34).png" alt=""><figcaption></figcaption></figure>

Next step is to copy and send the unique invite or the link to the invite.

<figure><img src="../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>

#### 2.4  **Removing users from groups**

<figure><img src="../.gitbook/assets/image (1) (3) (2) (1).png" alt=""><figcaption></figcaption></figure>
