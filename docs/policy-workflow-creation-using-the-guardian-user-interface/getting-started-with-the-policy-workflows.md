# Getting Started with the Policy Workflows

First, note that we are in the Policies Configuration Tab of the Guardian interface, and we have the role of the Standard Registry since only the Standard Registry can create a new policy.

Second, you click on the blue **Create Policy** button!

![](../.gitbook/assets/PW\_image\_1.png)

{% hint style="info" %}
**Note :** The "tag" field is important to be able to reference this policy in possibly other policies as a dependent policy
{% endhint %}

![](../.gitbook/assets/PW\_image\_2.png)

Once we have created the Draft of the policy – notice the status field showing draft – click on the “Edit” link on the right.

![](../.gitbook/assets/PW\_image\_3.png)

The edit screen will open and you will notice two boxes on the right side of the screen. The top Policy box is static and offers the ability to add high-level “Policy properties.” You can edit the name, Policy Tag, etc. Note that you can also create custom roles that are specific to your policy.

![](<../.gitbook/assets/image 5.png>)

The second Interface ContainerBlock is specific to the first workflow block. We will begin editing this block to build our policy!

Let’s start with “Permissions”

There are currently 3 permissions or roles with permissions configured that can be applied to a policy:\
1\. Standard Registry with the highest level of permissions, equivalent to an administrator of the policy,\
2\. User which is the entity applying to receive the Renewable Energy Credits from iRec,\
3\. Auditor as the entity that can view the “Trust Chain” or all of the important events that led to the creation of the Renewable Energy Credit

But in the Permissions we can choose only: policy roles, any role, no role, owner.

Then we select the “type” of UI we want to utilize. In our example, we choose the “Blank” template.

![](../.gitbook/assets/PW\_image\_4.png)

**Programmatically you begin like this:**

```
//Policy logic starts with block 1.
{
  //blockType - the type of the block:
  //  "InterfaceContainerBlock" - a block which contains and organizes other blocks.
  //  First block should always be of the "interfaceContainerBlock" type.
  "blockType": "InterfaceContainerBlock",
  //defaultActive shows whether this block is active at this time and whether it needs to be shown.
  "defaultActive": true,
  //permissions - users with these roles are allowed to interact with the block. Can contain the following values:
  //  "OWNER" = creator of the Policy.
  //  "NO_ROLE" = users without a role.
  //  "ANY_ROLE" = users with any role.
  //  "INSTALLER" = only users with a particular role (in this case - INSTALLER).
  "permissions": [
    // As per above, this block is accessible to all users (with any role).
    "ANY_ROLE"
  ],
  //uiMetaData - additional options which don't affect the behavior of the block but are needed for rendering.
  "uiMetaData": {
    //type - block UI behavior, can contain the following values:
    //  "blank" - does not contain any frame, will render all child elements one after the other.
    //  "tabs" - a container which has a tab for each of the child element. It will render the first child element as type "blank".
    "type": "blank"
  },
  //children - list of child blocks in a container block.
  "children": [
```

{% hint style="info" %}
**Note:** In Guardian Version 1.0.2 there was new functionality implemented that allows for creation of choose Role Block.
{% endhint %}

![](../.gitbook/assets/PW\_image\_5.png)

**Programmatically you begin like this:**

```
//children - list of child blocks in a Container Block.
  "children": [
    //First policy step - select a role.
    {
      //"PolicyRolesBlock" - block which determines a role for the user.
      "blockType": "PolicyRolesBlock",
      //"tag" - a unique (for the Policy) textual tag for the block which can be used in other blocks for linking.
      "tag": "choose_role",
      //Non ContainerBlock do not contain child elements. They can exist but they are ignored for rendering.
      "children": [],
      "uiMetaData": {
        //html component has title and descriptions, which can be specified in the corresponding elements.
        "title": "registration",
        "description": "choose a role"
      },
      "permissions": [
        //Only users with no roles assigned can access the block.
        "NO_ROLE"
      ],
      //This block is active
      "defaultActive": true,
      //"roles" - available roles from which the user can choose.
      "roles": [
        //In this case the user can only be the INSTALLER.
        "INSTALLER"
      ]
    },
```
