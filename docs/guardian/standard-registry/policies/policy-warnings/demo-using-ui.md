---
icon: sidebar-flip
---

# Demo using UI

[Step By Step](demo-using-ui.md#id-1.-step-by-step)

[Demo Video](demo-using-ui.md#id-2.-demo-video)

## 1. Step By Step

### Purpose

Policy warnings improve authoring reliability by notifying users about non-fatal issues in policy definitions.

These may include deprecated components, unreachable blocks, or outdated configurations.

The system allows toggling visibility for each category, helping focus on relevant issues without hiding critical errors.

**Key principle: Errors are always shown and always affect policy validity.**

### Access & Configuration

#### Location

Toolbar → Validation → ▾ → Configuration.

From this dialog, users can enable or disable the display of warnings and informational messages by category.

<figure><img src="../../../../.gitbook/assets/unknown (6).png" alt=""><figcaption></figcaption></figure>

#### Default Behavior

* All toggles are OFF by default.
* Errors are always visible and affect policy validity.
* Filtering of warnings and information is handled on the backend through the ignoreRules configuration.

<figure><img src="../../../../.gitbook/assets/unknown (1) (1).png" alt=""><figcaption></figcaption></figure>

#### Message Severity

Messages are categorized by severity:

| **Severity** | **Description**                                            | **Configurable** |
| ------------ | ---------------------------------------------------------- | ---------------- |
| Error        | Critical validation failure. Prevents publishing.          | No               |
| Warning      | Potential issue (e.g., deprecated element, missing input). | Yes              |
| Info         | Non-critical advisory message.                             | Yes              |

#### Hierarchy and Visual Priority

**Error > Warning > Info**

If a block has multiple message types, the highest-severity badge is displayed.

**Filtering Behavior**

The filtering mechanism allows selective visibility control:

* Warnings – Master toggle for messages with severity warning.
* Information – Master toggle for messages with severity info.

{% hint style="info" %}
**Important: Turning on only “Warnings” or “Information” is not sufficient; you must also enable specific categories (see below).**
{% endhint %}

<figure><img src="../../../../.gitbook/assets/unknown (2) (1).png" alt=""><figcaption></figcaption></figure>

### Categories

#### Warnings (severity: "warning")

| **Category**           | **Description**                                         |
| ---------------------- | ------------------------------------------------------- |
| REACHABILITY\_NO\_IN   | Block has no incoming events (unreachable).             |
| REACHABILITY\_NO\_OUT  | Block has no outgoing events.                           |
| REACHABILITY\_ISOLATED | Block is isolated — no inbound or outbound connections. |
| DEPRECATION\_BLOCK     | Block uses a deprecated type.                           |
| DEPRECATION\_PROP      | Block uses deprecated property definitions.             |

#### Information (severity: "info")

Categories explicitly marked in the validation registry as info (e.g., minor deprecations, legacy hints).

<figure><img src="../../../../.gitbook/assets/unknown (3) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/unknown (4) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/unknown (5) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/unknown (6) (1).png" alt=""><figcaption></figcaption></figure>

### Behavior in the Editor

#### Visual Feedback

* The Block Tree assigns \[error], \[warning], or \[info] attributes to affected elements for highlighting.
* Block Properties Panel displays categorized lists under:
* Errors
* Warnings
* Information
* The Validation Toolbar shows counters and the currently active severity level:\
  Errors → Warnings → Info

#### Persistence

User selections are stored locally to preserve preferences between sessions.

| **Storage** | **Key**                                 | **Scope** |
| ----------- | --------------------------------------- | --------- |
| IndexedDB   | POLICY\_WARNINGS / IGNORE\_RULES\_STORE | policyId  |

Selections remain active until:

* “Clear Selection” is used in the dialog (resets toggles to OFF),
* The policy is deleted,
* Application state is cleared, or
* The policy is successfully published.

### Message sources

#### Deprecations

Source registries:

* DEPRECATED\_BLOCKS
* DEPRECATED\_PROPERTIES

Each entry’s severity determines whether it surfaces as a warning or informational message.

#### Reachability

Validation logic inspects:

* Explicit links: Events, options.events, target, to, targetTag, targetId.
* Implicit links: Blocks with defaultEvent === true, unless properties.stopPropagation === true.

These connect automatically to the next sibling block in sequence.

## 2. Demo Video

[Youtube](https://youtu.be/VYKE2NAbfmI?si=9RwWglglvlWrfLbL\&t=191)
