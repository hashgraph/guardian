---
tags:
  - concept
---

# Policy Configurator

The Policy Configurator is the visual editing environment in which a Standard Registry builds and maintains a policy – the executable definition of a methodology, made up of blocks, roles, schemas, tokens, and the events that connect them.

## The Problem It Solves

A Guardian policy is ultimately a single large JSON configuration. Written by hand, that configuration is unforgiving: block tags must be unique, events must reference blocks that exist, every form block must point at a valid schema, and every mint block at a valid token. A misspelled tag or an orphaned event is not visible until the policy is run, and by then the failure surfaces as a broken workflow rather than an obvious typo.

The Configurator removes that class of error from the authoring process. It presents the policy as a navigable tree instead of nested braces, offers only the property values that are valid in context, and validates the whole configuration on demand – so structural mistakes are caught while editing rather than during a project's first submission.

It also solves a collaboration problem. Methodology experts, not developers, own the rules being digitized. A visual editor lets them read, review, and adjust a policy without reading JSON, while still producing exactly the same artifact a developer would.

## How It Works

The Configurator is opened from a policy in **Draft** status and edits that draft in place. Nothing is published to Hedera while editing; the draft is a working copy that can be revised freely until it is dry-run or published.

**A policy is a tree of blocks.** Every policy starts from a single container block and nests other blocks inside it. Each block has a type that determines what it does – rendering a form, requesting a signature, minting a token, calling an external service – and a set of properties that configure that behavior. The Configurator shows this hierarchy in the tree panel on the left; selecting a block loads its properties into the panel on the right.

**Blocks are addressed by tag.** Each block carries a tag that is unique within the policy. Tags are how blocks refer to each other: an event that moves a document from one step to the next names its source and target by tag, not by position in the tree. This is why moving a block within the tree does not break the workflow, and why renaming a tag does.

**Events connect blocks into a workflow.** The tree describes containment; events describe flow. An event fires when something happens in one block – a document is approved, a form is submitted, a timer elapses – and triggers an action in another. Together, the tree and the event graph are what turn a set of blocks into a working process.

**The same policy has three representations.** The Configurator can display the policy as a **tree**, as **JSON**, or as **YAML**, and switching between them converts the current state rather than opening a different document. The tree is the primary editing surface; the text views exist for bulk edits, diffing, and copying configuration between policies. An edit made in any view is an edit to the same underlying configuration.

**Reusable parts come from modules and tools.** Alongside blocks, the Configurator exposes modules and tools – self-contained fragments of policy logic that can be dropped into a policy and edited as a unit. Tools are published and versioned independently, so a policy can adopt a shared, already-validated piece of logic instead of duplicating it.

**Validation is explicit.** The Configurator can validate the entire configuration and report problems against the specific blocks that caused them. A policy that fails validation can still be saved as a draft; it cannot be meaningfully run.

**Editing ends at dry run or publish.** A dry run executes the policy in an isolated environment with virtual users and no Hedera transactions, so the workflow can be exercised before it becomes permanent. Publishing releases a numbered version of the policy to the public domain, at which point the configuration is frozen – further changes require a new version.

## Key Distinctions

**Policy Configurator vs. Policy Wizard.** The Wizard asks a series of questions and generates a policy configuration from the answers. It is a starting point that produces a conventional structure quickly, and its output is an ordinary draft policy. The Configurator is where that draft – or any other policy – is refined, extended, and maintained. The Wizard creates; the Configurator edits.

**Policy Configurator vs. the Policy APIs.** The APIs read and write the same policy configuration programmatically, and are the right tool for automation, CI pipelines, and migrations. The Configurator is the interactive equivalent, aimed at authoring and review rather than repeatable scripted changes.

**Configuring a policy vs. running one.** The Configurator defines what a policy will do. Executing it – registering users, submitting documents, minting tokens – happens in the policy's own interface once it is dry-run or published, and is not part of the Configurator.

## Related

* [Creating a Policy through Policy Configurator](creating-a-policy-through-policy-configurator/README.md) – step-by-step construction of a policy in the editor
* [Getting Started with the Policy Workflows](creating-a-policy-through-policy-configurator/getting-started-with-the-policy-workflows.md) – the first blocks of a working policy
* [Available Policy Workflow Blocks](introduction/README.md) – the specification for every block type and its properties
