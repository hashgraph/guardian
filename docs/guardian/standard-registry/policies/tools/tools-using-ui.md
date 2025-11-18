# Tools using UI

1. [Step By Step Process](tools-using-ui.md#id-1.-step-by-step-process)
2. [Demo Video](tools-using-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. Managing Tools

Tools page (in the Policies section) provides facilities to manage Tools and create new ones.

<figure><img src="../../../../.gitbook/assets/image (211).png" alt=""><figcaption></figcaption></figure>

### 1.1 Importing Tools

Tools can be imported by clicking on "Import" button in Tools page as shown below:

<figure><img src="../../../../.gitbook/assets/image (270).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Important note on differences between imports of Tools vs. Modules and Policies.**

When importing Tools via message IDs:

1. Tool is non-editable when it is already published.
2. A single Tool can only be imported once, if it is already been imported then no additional import can take place.
3. Tools are imported as global entities for the Guardian instance, i.e. they are visible to all policy authors.
4. When Tools are imported as files (using file import) they behave in the same way as Policies and Modules.
{% endhint %}

### 1.2 Creating Tools

Tools can be created from scratch by clicking on "Create New" button in Tools page:

<figure><img src="../../../../.gitbook/assets/image (292).png" alt=""><figcaption></figcaption></figure>

### 1.3 Exporting Tools

Tools can be exported as files and if a Tool has been already published then its corresponding Hedera messageID can be retrieved.

<figure><img src="../../../../.gitbook/assets/image (317).png" alt=""><figcaption></figcaption></figure>

### 1.4 Deleting Tools

Tools that have not been published can only be deleted.

<figure><img src="../../../../.gitbook/assets/image (318).png" alt=""><figcaption></figcaption></figure>

### 1.5 Editing Tools

Tools that have not been published can only be edited.

<figure><img src="../../../../.gitbook/assets/image (319).png" alt=""><figcaption></figcaption></figure>

### 1.6 Changing Tools

While importing tool via file, or policy via file or IPFS, you can change used tools in preview dialog, it will change tools references in schemas and config automatically.

<figure><img src="../../../../.gitbook/assets/image (587) (1).png" alt=""><figcaption></figcaption></figure>

### 1.7 Status changed to Dry Run mode

Users can now update the status of a tool directly from the Tools Page.

#### **1.7.1 How to Enable Dry Run:**

**1.7.1 Through Tools Page:**

1. Navigate to the Tools Page.

<figure><img src="../../../../.gitbook/assets/image (438).png" alt=""><figcaption></figcaption></figure>

2. Find the tool you want to test.
3. Toggle the **Dry Run** switch to **ON**.

<figure><img src="../../../../.gitbook/assets/image (2) (12).png" alt=""><figcaption></figcaption></figure>

**1.7.2 Through Policy Configurator Page:**

<figure><img src="../../../../.gitbook/assets/image (3) (7).png" alt=""><figcaption></figcaption></figure>

## 2. Schemas

Tools can contain schemas, which are embedded in it. All the schemas related to tools can be seen in Schemas page with type : Tool Schemas.

<figure><img src="../../../../.gitbook/assets/image (320).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note:** Schemas from Tools can be used not only inside Tools, but also in the context of the Policy into which the Tool that contains the schema was added.
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (321).png" alt=""><figcaption></figcaption></figure>

## 3. How to Use Tools

### 3.1 Structure

Tools ‘insides’ are isolated from the Policy the Tool is added to. Policy components use _Variables_ and _Input\Output Events_ which constitute the interface for passing and retrieving data to/from the Tool.

{% hint style="info" %}
**Note:** Basic interoperation principles are similar to that of Modules and Policies
{% endhint %}

<figure><img src="../../../../.gitbook/assets/image (322).png" alt=""><figcaption></figcaption></figure>

#### 3.1.1 General Internal Structure

Tools are structurally similar to Policies, most of the capabilities available for creation of Policies are supported by Tools

<figure><img src="../../../../.gitbook/assets/image (323).png" alt=""><figcaption></figcaption></figure>

#### 3.1.2 Variables

Variables are used as an external interface of Tools. They allow the usage of names for structural elements of Tools, i.e. schemas, topics, roles, tokens, for setting their values inside the Policy where the Tool is used.

**Creating variables:**

Variables can be created/edited by using the right side tab name "Variables" in policy configurator as shown below:

<figure><img src="../../../../.gitbook/assets/image (324).png" alt=""><figcaption></figcaption></figure>

#### 3.1.3 Input/Output Events

Similarly, Input/Output Events variables are external interfaces for events. It allows you to determine which events this Tool will accept and which events will be generated.

**Input Events** – It provides a facility for entry into the Tool. Correspondingly, in the Policy (outside of the Tool) it is an ingress point of events. Whereas, inside the Tool this is the point where the events get generated.

<figure><img src="../../../../.gitbook/assets/image (325).png" alt=""><figcaption></figcaption></figure>

**Output Events** – It provides the facility for exiting the Tools. Correspondingly, in the Policy (outside of the Tool) this is the point where events get generated. Whereas, inside the Tool this is an ingress point for events destined for the ‘outside’.

<figure><img src="../../../../.gitbook/assets/image (326).png" alt=""><figcaption></figcaption></figure>

### 3.2 Using Under Policies

Tools can be added to the Policy similarly to Module and/or Blocks.

<figure><img src="../../../../.gitbook/assets/image (327).png" alt=""><figcaption></figcaption></figure>

## 2. Demo Video

[Youtube](https://youtu.be/L0L0Kd7vkkU?si=4oB_YnRq7cOV4BMR\&t=110)
