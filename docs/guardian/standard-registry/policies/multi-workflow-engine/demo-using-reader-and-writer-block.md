---
icon: computer
---

# Demo using Reader and Writer Block

## 1. Overview

This demo showcases a complete message lifecycle within the Guardian-based workflow:

1. Admin pre-configuration (Schema & Branch setup)
2. Topic creation and routing configuration
3. External message ingestion simulation
4. Schema validation and branch-based distribution
5. Data transformation, calculation, and persistence
6. Publishing to IPFS and a Hedera topic
7. Forwarding processed VCs to additional external topics

The objective is to demonstrate how Verifiable Credentials (VCs) are validated, routed dynamically based on business rules, processed independently per branch, and then published to distributed infrastructure and external systems.

## 2. Admin Pre-Configuration (Schema & Branch Setup)

### Objective

Demonstrate how an administrator configures validation and routing rules before runtime.

### Steps Demonstrated

#### 2.1 Reader Block Configuration

* The **Reader block** is opened in edit mode.
* Multiple **branches** are created to handle different commodity types:
  * `BEEF`
  * `DAIRY`

<figure><img src="../../../../.gitbook/assets/image (6).png" alt=""><figcaption></figcaption></figure>

#### 2.2 Schema Assignment

* A specific **schema** is assigned to the Reader block.
* This schema defines the required structure of incoming VC documents.
* Only VCs that conform to this schema are eligible for processing.

**Key Outcome**

* Any incoming VC must:
  1. Match the assigned schema.
  2. Contain the expected routing field (`commodityType`).
* If validation fails, the message is rejected before routing.

## 3. Topics and Routing Configuration

### Objective

Show how message channels are created and routing rules are defined.

### 3.1 Topic Creation (Reader & Writer Blocks)

#### Reader Block

* A new **input topic** is created.
* The topic is activated.
* It becomes the ingestion point for external VC messages.

<figure><img src="../../../../.gitbook/assets/image (1) (1).png" alt=""><figcaption></figcaption></figure>

#### Writer Block(s)

* Output topics are created for:
  * Processed data publishing
  * Forwarding to second and third external topics

<figure><img src="../../../../.gitbook/assets/image (2) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (4) (1).png" alt=""><figcaption></figcaption></figure>

Each topic is:

* Created
* Activated
* Connected to the appropriate block

### 3.2 Routing Rule Configuration

Routing logic is configured inside the Reader block:

* A specific field: `commodityType`
* Conditional routing:
  * If `commodityType = BEEF` → Route to BEEF branch
  * If `commodityType = DAIRY` → Route to DAIRY branch
* Routing only occurs after schema validation passes

<figure><img src="../../../../.gitbook/assets/image (3) (1).png" alt=""><figcaption></figcaption></figure>

## 4. External Input Simulation

#### Objective

Simulate a third-party system sending messages into the workflow.

### 4.1 External Block Usage

The **External block** simulates an outside system.

Two messages are sent:

1. Message 1 → `commodityType = BEEF`
2. Message 2 → `commodityType = DAIRY`

<figure><img src="../../../../.gitbook/assets/image (6) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/image (7).png" alt=""><figcaption></figcaption></figure>

### 4.2 Topic Confirmation

We confirm:

* Both messages are successfully written to the external input topic.
* Messages are visible in the topic explorer/log.
* No schema errors are triggered.

#### Result

The ingestion pipeline is functioning correctly.
