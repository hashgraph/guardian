# 💻 Modules using UI

For a demo example of following steps, here is the policy timestamp: **1677851599.493646003**

## **Policy Modules**

Policy Modules are large-scale components of the policy containing multiple blocks and internal events. Modules expose external interfaces through which they interoperate with the rest of the policy (blocks).

### 1. **Managing modules**

Modules are managed via the corresponding page in the Policies section.

![image1.png](<../../../../.gitbook/assets/0 (1) (2).png>)

#### **1.1 Creating Modules**

Modules can be created via the Modules management page in the Guardian UI by clicking on **Create New** button as shown below:

![image2.png](<../../../../.gitbook/assets/1 (1) (2).png>)

Modules can also be created via the Policy editor UI in two ways: 1. By clicking on Create New Module button, 2. Converting policy to Module.

![image3.png](<../../../../.gitbook/assets/2 (6).png>)

![image4.png](<../../../../.gitbook/assets/3 (2).png>)

#### 1.2 Module Import

Modules can be imported from local file system or from IPFS via messageIds.

<figure><img src="../../../../.gitbook/assets/4 (2).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../../.gitbook/assets/5 (5).png" alt=""><figcaption></figcaption></figure>

#### 1.3 Module Export

Modules can be exported as files or/and ‘published’ into IPFS. For published modules users can retrieve its messageId which can serve as a reference for import elsewhere.

![image7.png](<../../../../.gitbook/assets/6 (5).png>)

![image8.png](<../../../../.gitbook/assets/7 (1).png>)

#### 1.4 Deleting Module

Modules which have not been published can be deleted.

![image9.png](<../../../../.gitbook/assets/8 (1) (3).png>)

#### 1.5 Editing Modules

Modules which have not been published can be edited.

![image10.png](<../../../../.gitbook/assets/9 (6).png>)

### 2. Using Modules

#### 2.1 Module Structure

The ‘insides’ of modules are isolated from the rest of Policy it may be embedded into. The external view of a module is represented by _**Variables**_ and _**Input\Output Events**_, which serve as an interface of the Module and transmit data into and out of the module.

<figure><img src="../../../../.gitbook/assets/10 (6).png" alt=""><figcaption></figcaption></figure>

#### 2.1.1 Generic Structure

Generic structure of Modules is the same as Policies, most of the functionality used for creation of Policies can be used in Modules.

<figure><img src="../../../../.gitbook/assets/11 (1).png" alt=""><figcaption></figcaption></figure>

#### 2.1.2 Variables

Variable are part of the external interface of Modules, they are used to represent schemas/tokens/topics/roles inside the module, their values are assigned outside of the module in the Policy where the module is embedded.

**Creating variables:**

![image13.png](<../../../../.gitbook/assets/12 (1).png>)

**Using variables inside modules:**

![image14.png](<../../../../.gitbook/assets/13 (1).png>)

**Assigning values to the (module) variables in Policy:**

![image15.png](<../../../../.gitbook/assets/14 (4) (1).png>)

#### 2.1.3 Input\Output Events

Similarly to Variables, Input\Output Events are the second part of the interface for Modules. Events define which events this module will receive from and send to other block in the Policy (external to the module).

**Input Events** – incoming events into the module. For the rest of the Policy this is the ingress endpoint for the module, from inside the module this is the point where all events appear to be generated.

![image16.png](<../../../../.gitbook/assets/15 (3).png>)

**Output Events** – outgoing events from the module. From the rest of the policy this looks like the point of events generation, while inside the module this is the event sink.

![image17.png](<../../../../.gitbook/assets/16 (3).png>)

### 2.2 Using Modules in the Policy

#### 2.2.1 Using existing modules

Saved modules can be found in the left-hand panel in the Modules section of the UI. They can be used similarly to the ordinary Policy blocks.

![image18.png](<../../../../.gitbook/assets/17 (3).png>)

#### 2.2.2 Creating new modules

In the Policy Editor new modules can be created similarly to creating of a new block.

![image19.png](<../../../../.gitbook/assets/18 (3).png>)

#### 2.2.3 Transforming blocks into modules

Selected block can be transformed into a module together with all its child components and events.

![image20.png](<../../../../.gitbook/assets/19 (4).png>)

{% hint style="info" %}
**Important Note**: Settings for roles, tokens, schemas and topics, as well as events which are external for the block will be lost during the conversion.
{% endhint %}

#### 2.2.4 Editing modules

Module added to the policy can be freely edited and changed. Module can be opened for viewing and editing via the navigation panel or by double-clicking its icon in the Policy editor.

#### 2.2.5 Saving modules

Modules added or created in the policy are ‘instances’ of the module and can only exist inside the policy until they are explicitly saved which adds them to the module library.

<figure><img src="../../../../.gitbook/assets/20 (2) (1).png" alt=""><figcaption></figcaption></figure>
