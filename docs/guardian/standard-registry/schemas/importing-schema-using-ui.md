---
icon: upload
---

# Importing Schema using UI

#### **1. Log in as Standard Registry**

* Only a **Standard Registry (SR)** can import schemas.
* Sign in to Guardian with your SR account.

#### **2. Go to the Schema Section**

* From the left navigation panel, click **Manage** **Schemas**.
* You’ll see a list of **System Schemas** (default ones) and any **Custom Schemas** created.

#### **3. Select “Import Schema”**

* Click the **Import Schema** button (usually in the top-right corner).

<figure><img src="../../../.gitbook/assets/image (419).png" alt=""><figcaption></figcaption></figure>

#### **4. Choose Import Source**

Guardian allows multiple ways to import schemas:

1. **From File (.json)**
   * Select Upload File.
   * Browse and upload a schema JSON file (must follow JSON Schema format).
2. **From IPFS / DID / URL**
   * Paste the schema IPFS CID, DID reference, or a public URL.
   * Guardian fetches the schema definition from that source.
3. **From Excel**
   * Select .xl file.
   * Browse and upload excel file.

<figure><img src="../../../.gitbook/assets/image (424).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note:

1. Files with **.schema** extension are only accepted. These files are in zip format, i.e. they are zip archives of the text file.
2. Initially when the Schema is created/imported, it will be in draft status.
{% endhint %}
