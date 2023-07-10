# 💻 Demo on Policy Wizard using UI

There are two ways to open Policy Wizard:

1. Click on Policy Wizard button from Policies Tab as shown below:

<figure><img src="../../../../.gitbook/assets/image (13) (6).png" alt=""><figcaption></figcaption></figure>

2. Open from the Policy Configurator page:

<figure><img src="../../../../.gitbook/assets/image (49).png" alt=""><figcaption></figcaption></figure>

## 4 step process to complete Policy Wizard:

### Policy Description:

This step allows users to setup policy information such as name, description, policy tag and topic description.

<figure><img src="../../../../.gitbook/assets/image (5) (2).png" alt=""><figcaption></figcaption></figure>

### Policy Roles:

This step provides facilities to manage policy roles. Created Roles can be deleted by clicking on them.

{% hint style="info" %}
**Note:** Owner is the default policy role (Policy Owner) and cannot be deleted.
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (43).png" alt=""><figcaption></figcaption></figure>

### 3. Policy Schemas

This step allows facilities to manage schemas in the policy by selecting schemas in the dropdown.

#### 3.1 {schema} configuration

<figure><img src="../../../../.gitbook/assets/image (14) (6).png" alt=""><figcaption></figcaption></figure>

At this stage users set roles which are able to view the document grid. Additionally they can set the _produced schema_ to configure _produced schema_ creation based on the current schema.

**Relationship schema** defines documents which will be placed in the relationships in the current schema (after creation).

**Initial for roles** field defines which roles will see this schema (instead of displaying grid immediately) after role choosing.

If **Approve and Reject** and **Minting tokens** are set to _enable_ the corresponding functions by this schema would be enabled. This additionally required to specify the token and the field in schema to be used in the minting rule.

{% hint style="info" %}
Note: We can select multiple schemas by entering the schemas names separated by a delimiter: ",".
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (17) (1).png" alt=""><figcaption></figcaption></figure>

#### 3.1.1 {role} configuration

<figure><img src="../../../../.gitbook/assets/image (3) (5).png" alt=""><figcaption></figcaption></figure>

This step allows:

1. To set _approver_ (only if _Approve and Reject functionality_ is enabled)
2. _creator_ flags for the selected role.
3. Also allows to select _grid columns_ (ordering is supported).

### 4. TrustChain

<figure><img src="../../../../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

This step allows to set up users which are able to view grids with VPs and the grid with the trust chain.

#### 4.1. {role} configuration

<figure><img src="../../../../.gitbook/assets/image (11) (1).png" alt=""><figcaption></figcaption></figure>

In this step, Users can choose a minting schema which will be displayed on the trust chain. Additionally, visibility for VPs can be configured to ‘only own ‘ (recommended for the roles other than OWNER) or to ‘all’.

## Save/Recovery Process

After the policy in the wizard is configured, users can click on ‘Create’ and thereby save the progress of the wizard configuration to be able to restore it later.

<figure><img src="../../../../.gitbook/assets/image (16).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:**

1. If ‘Cancel' is clicked, then the wizard progress will be removed.
2. Progress will be automatically removed when policy is published.
{% endhint %}

Next time, when the wizard is opened a dialog with the selector of wizard states would be displayed, where we can select respective policy and restore progress.

<figure><img src="../../../../.gitbook/assets/image (25) (4).png" alt=""><figcaption></figcaption></figure>
