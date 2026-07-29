---
description: >-
  Get setup and take your first steps with the Hedera Guardian and digital
  environmental assets.
---

# First steps \[Standard Registry]

{% hint style="warning" %}
This page is under development and part of the **3.7 Getting Started Epic**

The purpose of this page is to create a friendly guide to help a new user take their first steps in the Hedera Guardian.

This page is introduce users of high level concepts and is also dependent upon some custom setup such as roles, permissions, or test data which are under discussion.
{% endhint %}

***

#### First Steps with the Hedera Guardian and Digital Environmental Assets

The Hedera Guardian is an open source platform for issuing, verifying, and managing digital environmental assets. Follow the steps below to learn about primary capabilities of the Guardian.&#x20;

#### Get set up 0/5

{% stepper %}
{% step %}
## Create a Hedera testnet account

The Hedera Guardian operates on the Hedera network and a testnet or mainnet Hedera account is required.

<details>

<summary>Create a Hedera testnet account and add your details </summary>

1. Visit the [Hedera Developer Portal](https://portal.hedera.com/login).
2. Create a testnet account
3. Note the **Account ID** (`0.0.x`) and the **ED25519 DER Encoded Private Key** (ignore **ECDSA**)
4. Navigate to [Admin Settings](app://admin/settings)
5. Copy the **Account ID** and **ED25519 DER Encoded Private Key** from the  developer portal into the Operator ID and Operator Key fields

</details>
{% endstep %}

{% step %}
## Import a policy from the Methodology Library.

Policy's are digital workflows at the heart of the Hedera Guardian. The Methdology Libary for the Guardian ecosystem includes the world's largest repository of open source digital environmental policies.

<details>

<summary>Import a policy from the methodology library</summary>

1. Navigate to the [Methodology Library](https://github.com/hashgraph/guardian/tree/develop/Methodology%20Library/Tutorials/001-hello-world)
2. Download the Hello World Policy by clicking on the policy file and then clicking on the 'Download raw file' button.
3. Return to the Guardian and navigate to [Policies](app://policy-viewer)
4. Click the import icon and select the `Hello World.policy` file you just download

</details>
{% endstep %}

{% step %}
## Publish a policy to testnet

When you publish a policy, users defined in the policy such as project proponents, auditors, registry admins, data providers and other stakeholders defined by the policy author can interact with the policy over the Hedera network by submitting, reviewing, or approving data.

<details>

<summary>Publish your first policy to the Hedera testnet</summary>

1. Navigate to [Policies](app://policy-viewer)
2. Open the policy dropdown menu in the status column and select `Publish`
3. Set the Version to `1.0.0`
4. Set availability to `Public`
5. Click **Publish**

</details>
{% endstep %}

{% step %}
## Send data to a policy

Now that the policy is published, you can interact with the policy and submit data. The policy itself defines a workflow, schema, and policy roles which the Guardian uses to generate forms and even data submission endpoints.  &#x20;

<details>

<summary>Send data to a policy</summary>

1. Navigate to [Policies](app://policy-viewer) and click **Open** beside the published Hello World Policy&#x20;
2. Click **New Project** to open the dialog
3. Complete the form
4. Click **Submit**

</details>
{% endstep %}

{% step %}
## Inspect verifiable credential documents

Every submission in Guardian generates a verifiable credential — a tamper-proof, cryptographically signed record of data. Any data submitted to your policy can be inspected via your Guardian instance or by others across the Hedera Network. This is how registry owners, project developers, auditors, and dMRV providers can collaborate together transparently and securely.

<details>

<summary>Inspect verifiable credential documents</summary>

1. Open the published policy
2. Review the table of data submitted to this policy
3. Click **View Project Document**
4. Review the `credentialSubject` to see data within this document of the policy
5. Review the `proof` block to see the issuer's signature and signature type (e.g., `Ed25519Signature2018`).
6. Note the associated Hedera Consensus Service timestamp to see when this credential's hash was recorded on the network
7. This data is linked to your own testnet Hedera account and in real policies would be associated with the accounts interacting with your policy

</details>
{% endstep %}
{% endstepper %}

### Go further

* Concept: Policies
* Concept: Schemas
* Concept: Methodology Library
* Concept: Decentralized Guardian
* [Methodology Digitization Guide](https://guardian.hedera.com/methodology-digitization)
* [Subscribe to community calendar](https://lu.ma/guardian)
* [Share your feedback or request support](https://tiny.cc/grd-feedback)
