---
icon: viruses
---

# Multi-Workflow Engine

## 1. Purpose

* Share document references between independent policies/instances using global topics.
* Let other policies listen to those topics and process incoming references in their own branches.
* Keep processing predictable: only events that match configured type/schema/filters are routed and executed.

## 2. Location

### **Admin setup (Policy Configurator)**

Where to add the blocks

* Open Policy Configurator
* Add Global Events Writer and Global Events Reader to the policy flow

<figure><img src="../../../.gitbook/assets/unknown (23).png" alt=""><figcaption></figcaption></figure>

Get complete information about the blocks: [Global Events Writer Block](policy-creation/introduction/global-events-writer-block.md) and [Global Events Reader Block](policy-creation/introduction/global-events-reader-block.md)

### 3. Publish policy

* Reader/Writer do not work in Dry Run (block UI/pages are not shown and logic is not executed)
* Publish the policy so configuration is applied in a real run.

### 4. User setup (during policy execution)

#### **Streams management (Writer/Reader)**

* In the running policy UI, open the Reader/Writer block page (streams/topics management)
* User can:
  * Add a global topic
  * Create a global topic
  * Toggle Active ON/OFF
    * ON = Writer publishes / Reader reads & processes
    * OFF = Writer skips / Reader ignores
  * Delete a topic/stream

#### **Streams management (Writer)**

* Document type by topic

<figure><img src="../../../.gitbook/assets/unknown (24).png" alt=""><figcaption></figcaption></figure>

#### **Streams management (Reader)**

* User can set filter fields/values for a topic
* Filters are applied only if:
  * document type is VC
  * Admin configured a schema for the target branch

<figure><img src="../../../.gitbook/assets/unknown (25).png" alt=""><figcaption></figcaption></figure>

#### **Branch execution rule (Reader)**

* A branch is executed only if the incoming event passes all checks:
  * document type matches (if configured)
  * schema validation passes (if configured)
  * field filters match (only if enabled and applicable)

<figure><img src="../../../.gitbook/assets/unknown (27).png" alt=""><figcaption></figcaption></figure>
