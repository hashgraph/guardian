# Guardian Topic Hierarchy

How Hedera Guardian organizes topics, policies, and verifiable credentials (VCs) on the Hedera Consensus Service (HCS).

## Overview

Guardian uses a tree of HCS topics to organize all its data. Every message — registry registrations, policy drafts, published methodologies, project submissions, MRV reports, issuance claims — is published on a specific topic in this tree. The parent-child relationships between topics define ownership and scope.

## Topic Types

| Type | Purpose | Example |
|------|---------|---------|
| **Seed Topic** | Global entry point. All Standard Registries announce themselves here. One per Guardian deployment/network. | `0.0.1368856` |
| **User Topic** | A registry's workspace. Created when a Standard Registry registers. All of that registry's policies and activity happen under this topic. | `0.0.8355607` |
| **Policy Topic** | Created when a registry drafts a new policy. Child of the user topic. | `0.0.8356045` |
| **Instance Policy Topic** | Created when a policy is published (goes live). Child of the policy topic. This is the "workspace" for the running policy instance. | `0.0.8356056` |
| **Dynamic Topic** | Created at runtime when a user interacts with a policy (e.g., submits a project, takes on a role). Child of the instance policy topic. Named by function (e.g., "Project"). | `0.0.8356180` |

## Lifecycle — Traced with a Real Example

This traces the real mainnet lifecycle of DOVU's "ISO14064 Forest Conservation" methodology.

### Step 1: Standard Registry Registers

DOVU announces itself on the **seed topic** (`0.0.1368856`):

```
Message type:   Standard Registry
Action:         Init
Topic:          0.0.1368856 (seed)
Name:           DOVU
DID:            did:hedera:mainnet:258y3oVVbfH7HQ6h7mYj9ZPCPXQ2j7Z2PwMpG8CmYuKh_0.0.8355607
```

This creates the registry's identity. The DID embeds the **user topic** `0.0.8355607` — that's where DOVU will do all its future work.

### Step 2: Registry Creates a Policy (Draft)

DOVU creates a policy on its **user topic**:

```
Message type:   Policy
Action:         create-policy
Topic:          0.0.8355607 (user topic)
Name:           ISO14064_Forest_Conservation
```

This is just a draft — the policy is being designed, not live yet.

### Step 3: Guardian Creates a Policy Topic

Two paired `Topic` messages establish the parent-child link:

```
Topic create-topic on 0.0.8355634 → parentId: 0.0.8355607   (POLICY_TOPIC)
Topic create-topic on 0.0.8355607 → childId:  0.0.8355634   (POLICY_TOPIC)
```

`0.0.8355634` is now a dedicated **policy topic** under the user topic. Guardian always publishes paired messages (one on parent announcing the child, one on child declaring its parent).

### Step 4: Policy is Published → Instance-Policy

The draft goes live:

```
Message type:   Instance-Policy
Action:         publish-policy
Topic:          0.0.8356045 (policy topic)
Name:           ISO14064_Forest_Conservation_1740416020956
CID:            bafybei... (ZIP archive with policy.json, schemas, tokens)
```

This `Instance-Policy` message is the **canonical methodology** — the one we display in the Sustainable Explorer UI. The attached CID points to a ZIP containing the full policy definition, JSON schemas for VCs, and token definitions.

### Step 5: Guardian Creates an Instance Policy Topic

```
Topic create-topic on 0.0.8356056 → parentId: 0.0.8356045   (INSTANCE_POLICY_TOPIC)
Topic create-topic on 0.0.8356045 → childId:  0.0.8356056   (INSTANCE_POLICY_TOPIC)
```

`0.0.8356056` is the **instance policy topic** — the active workspace where this published policy instance operates. The Instance-Policy message's `options.topicId` points here.

### Step 6: A User Submits a Project → Dynamic Topic

When someone registers a project under this policy, Guardian creates a **dynamic topic**:

```
Topic create-topic on 0.0.8356180 → parentId: 0.0.8356056   (DYNAMIC_TOPIC, name="Project")
Topic create-topic on 0.0.8356056 → childId:  0.0.8356180   (DYNAMIC_TOPIC, name="Project")
```

`0.0.8356180` is this specific project's own topic. There can be multiple dynamic topics per instance — one per project, role, or group.

### Step 7: VCs Are Published

Verifiable Credentials (site data, MRV reports, issuance claims) are published on the instance policy topic or on dynamic project topics:

```
VC-Document on 0.0.8356056   ← 23 VCs directly on the instance topic
VC-Document on 0.0.8356180   ← VCs on the project's dynamic topic
```

These carry the actual sustainability data: project descriptions, carbon removal measurements, vintage claims, tokenization requests, etc.

## The Full Tree

```
0.0.1368856  SEED TOPIC (global Guardian entry point)
│
├── Standard Registry "DOVU" registers (Init)
│
└── 0.0.8355607  USER TOPIC (DOVU's workspace)
    │
    ├── Policy "ISO14064_Forest_Conservation" (draft)
    │
    └── 0.0.8356045  POLICY TOPIC
        │
        ├── Instance-Policy published here (the live methodology)
        │
        └── 0.0.8356056  INSTANCE POLICY TOPIC (policy workspace)
            │
            ├── 23 VC-Documents (directly on instance topic)
            │
            └── 0.0.8356180  DYNAMIC TOPIC "Project"
                │
                └── VC-Documents (site data, MRV, issuance claims)
```

## Resolving VCs → Policy

To find which policy a VC belongs to:

1. Take the VC's `topicId`
2. Walk up the parent chain via `Topic` messages (`options.parentId`)
3. Stop when you reach a topic where an `Instance-Policy` (with `action='publish-policy'`) was published
4. That Instance-Policy is the VC's parent methodology

In practice, VCs are always **1–2 hops** below the instance policy topic:
- Directly on the instance policy topic (0 hops via dynamic topic)
- On a dynamic "Project" topic (1 hop)

## Key Observations

- **Topic messages come in pairs**: one on the parent (announcing `childId`) and one on the child (declaring `parentId`). Either can be used to build the tree.
- **`options.topicId`** on an `Instance-Policy` message points to the instance policy topic. This is the primary key for resolving VCs to policies.
- **Multiple policy versions** can exist under the same user topic. Each publish creates a new instance policy topic, so VCs are naturally scoped to the correct version.
- **The seed topic** is the only topic you need to bootstrap the entire tree. From there, Standard Registry messages reveal user topics, which reveal policy topics, and so on.

## Message Types on Each Topic Level

| Topic Level | Message Types Found |
|-------------|-------------------|
| Seed Topic | `Standard Registry` (Init/Initialization) |
| User Topic | `Policy` (create-policy), `Topic` (create-topic) |
| Policy Topic | `Instance-Policy` (publish-policy), `Topic` (create-topic), `Policy` (create-policy for revisions) |
| Instance Policy Topic | `Topic` (create-topic for dynamic topics), `VC-Document`, `DID-Document` |
| Dynamic Topic | `VC-Document`, `VP-Document` |
