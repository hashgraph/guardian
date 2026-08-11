---
description: How contribute a task page to the Guardian docs
tags:
  - template
---

# Task Template

{% hint style="info" %}
**Task Template**

Use for: any single, discrete action with a clear end state. One task per page. If completing a goal requires two fundamentally different workflows, those are two task pages. Every step should describe a physical action that can be performed and verified. Notes that apply to a specific step live under that step, not in a floating callout elsewhere.

**Task Page Title**: _Start with a verb, name the outcome — e.g. "Create a Policy Integrity Test", "Import a schema from Excel", "Configure MFA for your account"_
{% endhint %}



***

One to two sentences. What this task accomplishes and why someone would do it. Link to the concept page rather than re-explaining the feature here.

#### Prerequisites

* Prerequisite one (role, state, version requirement)
* Prerequisite two

Remove this section entirely if there are no prerequisites.

#### Steps

1. First step. Start with a verb. Name UI elements exactly as they appear in the interface.
2. Second step. If the user must know something to avoid an error at this specific step, add a note here — not in a separate section.
3. Continue for each step. If a step branches, use a sub-list:
   * If the policy is in Draft state: do this
   * If the policy is Published: do this

#### Result

What the user sees or has when the task is complete. One to three sentences. Be concrete and specific.

#### Troubleshooting

Only include this section if there are known failure modes specific to this task. Use question format:

**\[Description of the failure the user sees]** Explanation of why it happens and what to do.

Do not duplicate generic troubleshooting from the Getting Started page — link there instead. Remove this section if there is nothing task-specific to cover.

#### Related

* Concept: name of the concept page for this feature
* Task: related task the user might do next
* Reference: API endpoint or schema spec if applicable

***
