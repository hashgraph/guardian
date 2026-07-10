---
description: >-
  This page describes first steps with the Guardian and digital environmental
  assets for new users.
---

# First steps with digital environmental assets (simplified)

{% hint style="warning" %}
This page is under development and part of the **3.7 Getting Started Epic**&#x20;

The purpose of this page is to create a friendly guide to help a new user take their first steps in the Hedera Guardian. This page is descriptive only and will introduce all users of high level concepts without relying upon custom setuup, roles, permissions, or test data.
{% endhint %}

## Dependencies

This page has internal and external dependencies which are listed here.

EXTERNAL LINKS

* Hedera Developer Portal
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

The Hedera Guardian is an open source platform for issuing, verifying, and managing digital environmental assets. Follow the First Steps below. If you are not an admin were invited by a which may depend upon the roles and permissions if you joined via an invitation. &#x20;



* #### Get set up • 0/5 steps

{% stepper %}
{% step %}
### Create a Hedera testnet account

The Hedera Guardian operates on the Hedera network with a testnet or mainnet account. Setup the Guardian with a testnet account.

<details>

<summary>Create a Hedera testnet account and add to the Guardian</summary>

1. Visit the [Hedera Developer Portal](https://portal.hedera.com/login).
2. Create a testnet account&#x20;
3. Note the **Account ID** (`0.0.x`).
4. Note the **ED25519 DER Encoded Private Key** (ignore **ECDSA**)
5. Navigate to \[Admin > Settings | Open Link in new Tab]
6. Copy **Account ID** (`0.0.x`) from the developer portal
7. Paste into the Operator ID field&#x20;
8. Copy **ED25519 DER Encoded Private Key** from the developer portal
9. Paste into the Operator Key field

</details>
{% endstep %}

{% step %}
### Import a policy

Policy's are digital workflows at the heart of the Hedera Guardian. Import a sample policy from the methodology library.

<details>

<summary>Import a policy from the methodology library</summary>

1. Visit the \[Methodology Library | Open Link in new Tab]&#x20;
2. Download the \[Hello World Policy | Direct Download Link Github] policy file
3. Navigate to \[Manage Policies | Open Link in new Tab]
4. Click the Import icon and select the `FirstSteps-HelloWorld.policy` file

</details>
{% endstep %}

{% step %}
### Publish a policy to testnet

Publish a policy on testnet so that project proponents or stakeholders can submit data to the policy.

<details>

<summary>Publish your first policy to the Hedera testnet  </summary>

1. Navigate to \[Manage Policies | Open Link in new Tab]&#x20;
2. Click the dropdown in the status column and select publish.
3. Set the Version to 1.0.0 and Availability to Public
4. Click Publish

</details>
{% endstep %}

{% step %}
### Conclusion

You have now published your first policy which users will be able to interact with. Next you will&#x20;
{% endstep %}

{% step %}
### Submit data

REQUIRES USER ACCOUNT TO SUBMIT DATA

* SR Account
* User

<details>

<summary>Project proponents submit data </summary>

Visit a \[LINK: PROJECT] to view your policy running on testnet and submit data. This is how a project proponents would submit their project for verification and validation.&#x20;

1. Log Out
2. Sign up as regular user
3. Generate Hedera Testnet Account
4. Create New DID

</details>
{% endstep %}

{% step %}
### Inspect documents

<details>

<summary>Visit the Audit section to inspect documents</summary>

Visit the \[LINK: AUDIT] interface to inspect the documents created after data was submitted for the policy. This is how auditors and VVBs would review projects submitted by project proponents.&#x20;

</details>
{% endstep %}
{% endstepper %}

### Go further

* Digitizing Methodology Guide
* [Subscribe to community calendar](https://lu.ma/guardian)
* [Share your feedback or request support](https://tiny.cc/grd-feedback)
* LINK Contributing
