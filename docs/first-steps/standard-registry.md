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

## Dependencies

This page has internal and external dependencies which are listed here.

EXTERNAL LINKS

* Hedera Developer Portal
  *
* Methodology Library (Github)
* First Steps Policy (to be created)

INTERNAL LINKS

* Admin > Settings
* Manage Policies

INTERNAL ACTIONS

* Import Policy
* Publish Policy

***

#### First Steps with Hedera Guardian {VERSION} and Digital Environmental Assets

The Hedera Guardian is an open source platform for issuing, verifying, and managing digital environmental assets. Follow the steps below to learn about primary capabilities of the Guardian.&#x20;

#### Get set up 0/5

{% stepper %}
{% step %}
## Create a Hedera testnet account

The Hedera Guardian operates on the Hedera network and a testnet or mainnet Hedera account is required.

<details>

<summary>Create a Hedera testnet account and add your details </summary>

1. Visit the \[Hedera Developer Portal]\(https://portal.hedera.com/login).
2. Create a testnet account
3. Note the **Account ID** (`0.0.x`) and the **ED25519 DER Encoded Private Key** (ignore **ECDSA**)
4. Navigate to \[Admin Settings]\(https://localhost/admin/settings)
5. Copy the **Account ID** and **ED25519 DER Encoded Private Key** from the  developer portal into the Operator ID and Operator Key fields

</details>
{% endstep %}

{% step %}
## Import a policy

Policy's are digital workflows at the heart of the Hedera Guardian. The Guardian ecosystem hosts the worlds largest repository of open source digital environmental policies. Import a sample policy from the methodology library.

<details>

<summary>Import a policy from the methodology library</summary>

1. Visit the \[Methodology Library]\(https://github.com/hashgraph/guardian/tree/3.7.0/Methodology%20Library)
2. Download the \[Hello World Policy]\(https://github.com/hashgraph/guardian/blob/3.7.0/Methodology%20Library/Tutorials/HelloWorld.policy) policy file
3. Navigate to \[Manage Policies]\(https://localhost/manage/policies)
4. Click the Import icon and select the `HelloWorld.policy` file

</details>
{% endstep %}

{% step %}
## Publish a policy to testnet

When you publish a policy to testnet, policy users such as project proponents, auditors, or other defined stakeholders can interact with the policy by submitting, inspecting, or approving data.

<details>

<summary>Publish your first policy to the Hedera testnet</summary>

1. Navigate to \[Manage Policies | Open Link in new Tab]
2. Click the dropdown in the status column and select publish.
3. Set the Version to 1.0.0 and Availability to Public
4. Click Publish

</details>
{% endstep %}

{% step %}
## Send data to a policy (draft)

Visit your published Hello World policy and submit an estimated CO2e value to see how data flows through a policy workflow.

<details>

<summary>Send data to a policy</summary>

1. Navigate to... and click the policy name to open it
2. Select your role (e.g. Hello World Project Proponent)..&#x20;
3. Locate the **CO2e Estimate** form, choose from the activity drop down and enter a sample value.
4. Click Submit

</details>
{% endstep %}

{% step %}
## Inspect verifiable credentials documents (draft)

Every submission in Guardian generates a verifiable credential — a tamper-proof, cryptographically signed record of the claim you just submitted, which can be independently verified without trusting a central authority.

<details>

<summary>Inspect verifiable credential documents</summary>

1. Navigate to Trust Chain or the **Documents** tab within your policy.
2. Locate the entry corresponding to the CO2e estimate you submitted in Step 4
3. Click the entry to open the raw VC document.
4. Review the `credentialSubject` field to see your submitted claim data.
5. Review the `proof` block to see the issuer's signature and signature type (e.g., `Ed25519Signature2018`).
6. Note the associated Hedera Consensus Service timestamp to see when this credential's hash was recorded on the network.

</details>
{% endstep %}
{% endstepper %}

### Go further

* Digitizing Methodology Guide
* ...
* [Subscribe to community calendar](https://lu.ma/guardian)
* [Share your feedback or request support](https://tiny.cc/grd-feedback)
* LINK Contributing
