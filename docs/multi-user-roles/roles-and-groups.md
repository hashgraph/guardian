# 💻 Creating Roles and Groups using Policy Configurator UI

### 1. Roles

Set of textual constants that are used to separate users into different roles.

#### 1.1 Creation of Roles

Roles can be created by adding Role Property and its Value in Policy Configurator as shown below:

<figure><img src="../.gitbook/assets/image (13) (3).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/Role1.1 (1).png" alt=""><figcaption></figcaption></figure>

#### 1.2 Usage

This is used for setting Permissions for a block, which limits which users can see this block or access it via the API.

<figure><img src="../.gitbook/assets/image (1) (4) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (33) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:** Permissions do not affect the Block via Events.
{% endhint %}

### 2. Groups

Groups are separate sets of documents access , which can be limited to users who are members of the group.

{% hint style="info" %}
**Note**: A user can be included into any number of groups with a single role within each. User roles can be different in different groups.
{% endhint %}

#### 2.1 Properties

| Property Name     | Definition                                                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name              | The name of the group                                                                                                                                                                                                                                                                                 |
| Creator Role      | Role which is assigned to the creator of the group                                                                                                                                                                                                                                                    |
| Members Role      | The list of roles which can be assigned to members of the group                                                                                                                                                                                                                                       |
| Relationship Type | <p>· Single – only a single user can be included in the group. This type is maintained for backward compatibility with historic policy versions.</p><p>· Multiple – the group can include multiple users. This is the new mode of operation.</p>                                                      |
| Access Type       | <p>· Global – static group is created at the start. The creator of the group is the creator of the policy.</p><p>· Private – a new instance of the group is created every time a user selects group creation action. The creator of the group is the user who executed the group creation action.</p> |

<figure><img src="../.gitbook/assets/image (22) (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (17) (1) (2).png" alt=""><figcaption></figcaption></figure>

#### 2.2 Usage

**documentsSourceAddon** has multiple filters which allow us to select relevant documents

| Owned by User | Owned by Group | Document Selection                                              |
| ------------- | -------------- | --------------------------------------------------------------- |
| False         | False          | Documents are not filtered by Owner.                            |
| True          | False          | Only documents created by the current user (in all groups)      |
| False         | True           | Only documents created in the current group (by all users)      |
| True          | True           | Only documents created by the current user in the current group |

<figure><img src="../.gitbook/assets/image (23) (3).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../.gitbook/assets/image (16) (3) (1).png" alt=""><figcaption></figcaption></figure>

### 3. Switching between Groups

When a policy contains multiple groups, users have an option to switch between those they are included in. The selection menu also allows to switch to the ‘no group’ default state, i.e. the state in which the user is not acting as a member of any group.

<figure><img src="../.gitbook/assets/image (32) (1) (1).png" alt=""><figcaption></figcaption></figure>
