# Getting started

First, note that we are in the Policies Configuration Tab of the Guardian interface, and we have the role of the RootAuthority since only the RootAuthority can create a new policy.

Second, you click on the blue Create Policy button!

![](<../.gitbook/assets/image (4).png>)

When the pop-up appears on the screen, fill out all the fields and then click on “Ok”.

**Note that the “tag” field is important to be able to reference this policy in possibly other policies as a dependent policy!**

![](../.gitbook/assets/image.png)

Once we have created the Draft of the policy – notice the status field showing draft – click on the “Edit” link on the right.

![](<../.gitbook/assets/image (3).png>)

The edit screen will open and you will notice two boxes on the right side of the screen. The top Policy box is static and offers the ability to add high-level “Policy properties.” You can edit the name, Policy Tag, etc. Note that you can also create custom roles that are specific to your policy.

![](<../.gitbook/assets/image (2).png>)

The second InterfaceContainerBlock is specific to the first workflow block. We will begin editing this block to build our policy!

&#x20;Let’s start with “Permissions”

There are currently 4 permissions or roles with permissions configured that can be applied to a policy:\
Root Authority with the highest level of permissions, equivalent to an administrator of the policy,\
Installer which is the entity applying to receive the Renewable Energy Credits from iRec,\
Auditor as the entity that can view the “Trust Chain” or all of the important events that led to the creation of the Renewable Energy Credit\
Originator as the entity invoking a Policy with a set of data to be issued new CO2-tokens

And we select Root-Authority and Installer in the drop-down as available roles in this policy workflow.

Then we select the “type” of UI we want to utilize. In our example, we choose the “Blank” template.

![](<../.gitbook/assets/image (1).png>)

**Programmatically you begin like this:**

****
