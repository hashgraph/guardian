---
icon: cart-plus
---

# Creating Schema using UI

#### **1. Log in as a Standard Registry**

* Only a **Standard Registry (SR)** role can create schemas.
* Sign in to Guardian with your SR account.

#### **2. Navigate to the Schema Section**

* From the left-hand navigation panel, go to **Manage** **Schemas**.
* You’ll see system schemas (default ones) and any custom schemas already created.

<figure><img src="../../../.gitbook/assets/image.png" alt=""><figcaption></figcaption></figure>

#### **3. Create a New Schema**

* Click **“Create Schema”**.
* Provide basic details:
  * **Name** → e.g., _Project Registration Schema_
  * **Policy** → Linking the policy e.g., VM0042 V2.1
  * **Description** → short explanation of what the schema will be used for
  * For(Entity) → Select the relevant document.&#x20;

<figure><img src="../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

#### **4. Define Schema Fields**

* Add **attributes (fields)** that define the data structure. For each field, you specify:
  * **Field Name** (e.g., _projectId_, _location_, _CO2Reduced_)
  * **Property** (property referring to schema field)
  * **Field Type** (string, number, boolean, array, object, date, etc.)
  * **Required or Optional**
  * **Allow multiple answers checkbox**
  * **Selected values (adding default, suggested, test values)**
* Example fields for a Project Schema:
  * `projectId` → number (required)

<figure><img src="../../../.gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

We can also customize the Field keys and Field Title by clicking on Advanced Tab.

<figure><img src="../../../.gitbook/assets/image (4).png" alt=""><figcaption></figcaption></figure>

#### **5. Save & Publish the Schema**

* Once all fields are defined → click **Save**.
* To make it usable in policies, click **Publish**.
  * Publishing makes the schema immutable and available to others.

<figure><img src="../../../.gitbook/assets/image (3).png" alt=""><figcaption></figcaption></figure>

6. #### Version

After clicking on Publish, you will be prompted to enter the version. After entering the Version and pressing the submit button, the status will change to Published.

<figure><img src="../../../.gitbook/assets/image (426).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Note**: All Schemas connected to a Policy gets published automatically when Policy gets published.
{% endhint %}

Once the System Schema is created, we have options for activating, deleting, editing and viewing JSON documents.

![](<../../../.gitbook/assets/image (9) (5).png>)
