# 💻 Demo using UI

[Step by Step](demo-using-ui.md#step-by-step)

[Demo Video](demo-using-ui.md#demo-video)

## Step By Step

## 1. Import-Time Configuration

When importing a policy (via file or message), users can enable tamper-resistance by selecting a dedicated “Track policy changes” checkbox during the import process.

Once enabled:

* The system captures and stores the original state of the policy
* All future modifications can be compared against this original baseline

{% hint style="danger" %}
&#x20;If the checkbox is not selected, the policy will behave as a standard imported policy with no tamper-tracking enabled.
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (12) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 2. Data Model Enhancements

When tamper-resistance is enabled, the following additional fields are stored in the database to preserve the original policy state:

* originalChanged – Indicates whether the policy has diverged from its original state
* originalHash – Cryptographic hash of the original policy
* originalZipId – Reference to the stored original policy file
* originalMessageId – Reference to the original message (for message-based imports)

#### File-Based Import Behavior

* The original policy file is securely stored in the database
* A unique file ID is assigned and linked to the policy
* This file acts as the immutable baseline for all future comparisons

## 3. UI Enhancements

### 3.1 Policies Grid – Modified Column

A new “Modified” column is added to the Policies grid to surface tamper status at a glance.

Possible States

* Compare – The policy has been modified and can be compared with the original version
* No Changes – The policy matches its original imported state
* Status Unavailable – Original state is not available (e.g., tracking was not enabled)

<figure><img src="../../../../.gitbook/assets/image (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

### 3.2 Compare Action

* Clicking **Compare** opens a detailed diff view
* Users can visually inspect differences between:
  * Original imported policy
  * Current policy state

This helps users quickly understand _what_ changed and _where_.

<figure><img src="../../../../.gitbook/assets/image (2) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

## 4. Indexer

The functionality for displaying policy origin, and relationships between original and derived policies has also been implemented in the Indexer.

In the policy description, new states related to this functionality are available: the Original tab is visible, the Derivations tab is visible, or no additional tab is displayed

<figure><img src="../../../../.gitbook/assets/image (26).png" alt=""><figcaption></figcaption></figure>

When the Origin tab is displayed, it means that information about the parent policy is available, allowing the user to check for any differences from the parent policy

<figure><img src="../../../../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

The comparison functionality remains consistent with the Guardian one, providing multiple comparison options, while the UI design has been updated

Once a policy has been used to create other policies, the Derivations tab is displayed

<figure><img src="../../../../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

The Derivations tab contains a table with all derivations of the current policy

<figure><img src="../../../../.gitbook/assets/image (3) (1).png" alt=""><figcaption></figcaption></figure>

## Demo Video

[Youtube](https://youtu.be/kEQ5V1aMFQ4)
