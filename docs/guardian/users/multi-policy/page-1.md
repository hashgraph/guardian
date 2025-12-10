# Configuring Multi Policy using UI

1. [Step By Step Process](page-1.md#id-1.-step-by-step-process)
2. [Demo Video](page-1.md#demo-video)

## 1. Step By Step Process

### 1. Registration of Primary Policy

Step 1: Need to click on the linking icon for the policy, which you wanted to be a primary one as shown below:

<figure><img src="../../../.gitbook/assets/image (4) (2).png" alt=""><figcaption></figcaption></figure>

Step 2: We get a policy linking pop up to create a link for the primary policy or joining an existing policy:

<figure><img src="../../../.gitbook/assets/image (7) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

After the ‘primary’ policy is registered a special ‘link’ becomes accessible which can be used to ‘connect’ additional ‘secondary’ policies.

<figure><img src="../../../.gitbook/assets/image (2) (5).png" alt=""><figcaption></figcaption></figure>

### 2. Connecting Secondary Policies

Step 1: We click again on the linking icon for secondary policy and will get a linking pop up as shown below:

<figure><img src="../../../.gitbook/assets/image (3) (2).png" alt=""><figcaption></figcaption></figure>

Step 2: In order to make the policy as secondary, we will click on Join button and link with the primary policy.

Step 3: Once, linking is performed successfully, you will get below message:

<figure><img src="../../../.gitbook/assets/image (5) (6).png" alt=""><figcaption></figcaption></figure>

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

## Demo Video

[Youtube](https://www.youtube.com/watch?v=wcOb19Pr-yo\&list=PLnld0e1pwLhqb69cELqQrW87JFVIDfocL\&index=31\&t=347s)
