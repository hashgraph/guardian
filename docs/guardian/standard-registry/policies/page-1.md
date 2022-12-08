# 💻 Configuring Multi Policy using UI

It is possible to ‘join’ multiple independent policies, which are hosted/ran by different Guardian instances, into a group in which one policy would be ‘primary’ and the rest ‘dependent’ or ‘secondary’.

In this setup (only) ’primary’ policies are responsible for minting tokens, which thus can be certified to be compliant with other (‘secondary’) policies via links to VPs issued by the ‘secondary’ policies.

The tokens are only minted when the necessary quorum of approvals (by the ‘secondary’ policies) are reached. This enables the creation of tokens for projects which are compliant with multiple policies codifying different methodologies, issued independently by different Standard Registries.

{% hint style="info" %}
**Note:**

1. Synchronization of the policy ‘approvals’ and mints is performed through the Header topic of the ‘primary’ policy.
2. Guardian instances check the topic for the synchronization message on schedule.
{% endhint %}

### 1. Registration of Primary Policy

Step 1: Need to click on the linking icon for the policy, which you wanted to be a primary one as shown below:

<figure><img src="../../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

Step 2: We get a policy linking pop up to create a link for the primary policy or joining an existing policy:

<figure><img src="../../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

After the ‘primary’ policy is registered a special ‘link’ becomes accessible which can be used to ‘connect’ additional ‘secondary’ policies.

<figure><img src="../../../.gitbook/assets/image (2) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 2. Connecting Secondary Policies

Step 1: We click again on the linking icon for secondary policy and will get a linking pop up as shown below:

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

Step 2: In order to make the policy as secondary, we will click on Join button and link with the primary policy.

Step 3: Once, linking is performed successfully, you will get below message:

<figure><img src="../../../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

### 3. **Message Format**

Synchronization topic contains two types of messages:

**3.1 Messages on linking the policies:**

| **Property** | **Description**                       | **Example**                          |
| ------------ | ------------------------------------- | ------------------------------------ |
| Id           | Message ID                            | a506d61c-9027-4b75-9dd6-3be126b6f9bf |
| status       | Message Status                        | "ISSUE"                              |
| type         | Message Type                          | "Synchronization Event"              |
| action       | Action Type                           | "create-multi-policy"                |
| lang         | Language                              | "en-US"                              |
| user         | User ID (Hedera Account ID)           | "0.0.47678906"                       |
| policy       | Policy ID (Hedera Topic ID)           | "0.0.48983405"                       |
| policyType   | Policy type (Main\|Sub)               | "Main"                               |
| policyOwner  | Standard Registry (Hedera Account ID) | "0.0.47678905"                       |

**3.2 Token mint messages**

| **Property** | **Description**                                                  | **Example**                            |
| ------------ | ---------------------------------------------------------------- | -------------------------------------- |
| id           | Message ID                                                       | "a506d61c-9027-4b75-9dd6-3be126b6f9bf" |
| status       | Message Status                                                   | "ISSUE"                                |
| type         | Message Type                                                     | "Synchronization Event"                |
| action       | Action Type                                                      | "mint"                                 |
| lang         | Language                                                         | "en-US"                                |
| user         | User ID (Hedera Account ID)                                      | "0.0.47678906"                         |
| policy       | Policy ID (Hedera Topic ID)                                      | "0.0.48983405"                         |
| policyType   | Policy type (Main\|Sub)                                          | "Main"                                 |
| policyOwner  | Standard Registry (Hedera Account ID)                            | "0.0.47678905"                         |
| messageId    | Link to the VP document of the mint                              | "1669634325.005962003"                 |
| tokenId      | Token ID which needs to be minted                                | "0.0.48983329"                         |
| amount       | Amount of tokens to mint                                         | 5                                      |
| memo         | Memo                                                             | "1669634325.005962003"                 |
| target       | User account ID to receive the minted tokens (Hedera Account ID) | "0.0.47678906"                         |
