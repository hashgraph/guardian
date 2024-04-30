# 💻 User Guide

1. [Step By Step Process](user-guide.md#id-1.-step-by-step-process)
2. [Demo Video](user-guide.md#id-2.-demo-video)

## 1. Step By Step Process

1. Click ‘Discontinue’ button for the policy in policies list

![image3.png](<../../../.gitbook/assets/0 (12).png>)

2. Policy can be marked ‘discontinued’ immediately (chose ‘Immediate’ option) or automatically at a later date (‘Deferred’ option)

![image1.png](<../../../.gitbook/assets/1 (14).png>)

3. In the UI policies, which were set to discontinue immediately are displayed with the red color in the status block and policies which are set to deferred discontinue are displayed with the gold warning color in the status block.

![image10.png](<../../../.gitbook/assets/2 (16).png>)

4. Discontinue actions in the UI triggers the issuance of the \[deferred-]discontinue-policy messages in the corresponding policy topic

![image12.png](<../../../.gitbook/assets/3 (13).png>)

5. Discontinued policy is displayed with a red bar in the UI. For these policies the creation of new documents for users/sensors is not disabled. Policies which are set to discontinue later (‘deferred’) are displayed with a yellow warning bar

![image4.png](<../../../.gitbook/assets/4 (11).png>)

![image11.png](<../../../.gitbook/assets/5 (14).png>)

6. When a policy has been discontinued users can migrate data to another (currently active) policy

![image6.png](<../../../.gitbook/assets/6 (13).png>)

### Migration steps order:

1. Policies: Select the source and the destination policy.
2. VP Documents : Select VPs which are to be migrated from the source policy.
3. VC Documents : Select VCs which are to be migrated from the source policy.
4. Schemas : Map the source policy schemas with the destination policy schemas.
5. Roles : Map source policy roles with the destination policy roles.
6. Groups : Map the source policy groups with the destination policy groups.
7. Tokens: Map the token templates&#x20;
8. Blocks :  Block mapping (while state migrating is enabled)
9. Clicking OK you will start an asynchronous migration task

<figure><img src="../../../.gitbook/assets/image (602).png" alt=""><figcaption></figcaption></figure>

![image9.png](<../../../.gitbook/assets/7 (13).png>)

3. When the task completes, a success or warning (in case of issues) notification is displayed.

![image8.png](<../../../.gitbook/assets/8 (14).png>)

## 2. Demo Video

[Youtube](https://www.youtube.com/watch?v=vvHI4AG-8z8\&list=PLnld0e1pwLhqdR0F9dusqILDww6uZywwR\&index=13)
