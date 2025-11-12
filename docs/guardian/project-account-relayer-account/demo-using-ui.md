# 💻 Demo using UI

## 1. Overview

Relayer accounts are Hedera accounts designated to execute on-chain transactions associated with specific policy subflows during runtime.

They are typically used to isolate and organize on-chain activities across multiple projects. This separation allows different Hedera accounts to be assigned for financing and executing blockchain operations - such as posting messages, minting tokens, or performing other policy-driven actions - within the context of distinct projects.

### 1.1 Creation

Users can add Relayer Accounts using the corresponding button on their profile page.

<figure><img src="../../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

To add an existing account, the account name, the Hedera account ID, and its private key must be provided.

<figure><img src="../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

It is also possible to create a new Hedera account and set it up as one of the relayer account for the user.

{% hint style="info" %}
Note 1: hbar balance of the new account would be 0 and would need to be toped-up (externally to Guardian) for the account to become useable.
{% endhint %}

<figure><img src="../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note 2: make sure that the private key of the generated account is securely saved somewhere. Guardian does not have facilities to recover the lost key.
{% endhint %}

### 1.2 Configuration

To enable Guardian users to use Relayer Accounts when executing policy workflow, the policy must have ‘Custom Relayer Account’ option switched on in the corresponding _requestVcDocumentBlock_, for example that which is responsible for project document. 

<figure><img src="../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

All linked documents will inherit parent’s Relayer Account, there is no need to configure this setting for each of them specifically. I.e. it is only required to be set for the main (i.e. project) document.

### 1.3 Usage

For policies with enabled ‘Relayer Accounts’ option users will be presented with the options to select account options

<figure><img src="../../.gitbook/assets/image (5).png" alt=""><figcaption></figcaption></figure>

1. User account – default behaviour backward compatible with previous Guardian versions. In this configuration individual user accounts will be used for each operation on Hedera corresponding to the user performing them.

<figure><img src="../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

2. Existing relayer account – users can add one of previously added Relayer Accounts.

<figure><img src="../../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

3. New relayer account – the account can be added directly from this form.

<figure><img src="../../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
_Note_: Make sure the selected account is funded, the account has hbar balance sufficient to finance on-chain operations required by the policy workflows.
{% endhint %}

## 2. Viewing

### 2.1 Document to account associations

Document view shows which Relayer Account is associated with it.

<figure><img src="../../.gitbook/assets/image (9).png" alt=""><figcaption></figcaption></figure>

### 2.2 Standard Registry (SR) functionality

Standard Registry can view all Relayer Accounts and balances for all users operating in its domain.

<figure><img src="../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>

## 3. Tokens

Unless the policy is configured to send minted tokens to a specific account, tokens minted under Relayer Account configuration will be sent to the Relayer Account associated with the VC document on the basis of which the mint operation has been triggered.

<figure><img src="../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (12).png" alt=""><figcaption></figcaption></figure>
