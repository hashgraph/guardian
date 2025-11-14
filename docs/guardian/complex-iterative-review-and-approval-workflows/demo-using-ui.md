---
icon: sidebar-flip
---

# Demo using UI

## 1. Document reviews

### 1.1 Overview

To enable document reviews within a policy, a corresponding button must be made available in the grid. (This button is combined with the document view function.)

<figure><img src="../../.gitbook/assets/image (628).png" alt=""><figcaption></figcaption></figure>

This button will appear in the grid for documents, showing a number of existing comments for each of them.

<figure><img src="../../.gitbook/assets/image (848).png" alt=""><figcaption></figcaption></figure>

### 1.2 Discussions

When opening a comments section a list of discussions is displayed. To create a comment, users must either select an existing discussion or create a new one.

<figure><img src="../../.gitbook/assets/image (849).png" alt=""><figcaption></figcaption></figure>

#### 1.2.1 Creating a Discussion

To create a discussion several fields must be filled out:

**Discussion name** - arbitrary human readable name (usually used for indicating the topic of the discussion).&#x20;

**Relationships** – references to other documents related to the current one.

<figure><img src="../../.gitbook/assets/image (850).png" alt=""><figcaption></figcaption></figure>

Selecting document in the ‘relationships’ will cause the discussion to be shown when viewing them as well.

<figure><img src="../../.gitbook/assets/image (851).png" alt=""><figcaption></figcaption></figure>

You can also link a discussion to a specific field in the document by adding a field reference.

<figure><img src="../../.gitbook/assets/image (852).png" alt=""><figcaption></figcaption></figure>

1. **Visibility Scope**\
   The visibility scope determines who can see a given discussion.

a. **Public** – all users who have access to the document

<figure><img src="../../.gitbook/assets/image (853).png" alt=""><figcaption></figcaption></figure>

b. **Roles** – users with specific roles (and the creator of the discussion)

<figure><img src="../../.gitbook/assets/image (854).png" alt=""><figcaption></figcaption></figure>

c. **Users** – only specified users (and the creator of the discussion)

<figure><img src="../../.gitbook/assets/image (855).png" alt=""><figcaption></figcaption></figure>

#### 1.2.2 Viewing

You can search for the desired discussion using a **search** function.

<figure><img src="../../.gitbook/assets/image (856).png" alt=""><figcaption></figcaption></figure>

Also it is possible to search (filter) discussions based on their field links

<figure><img src="../../.gitbook/assets/image (857).png" alt=""><figcaption></figcaption></figure>

The list of discussion participants can be viewed inside each discussion.

<figure><img src="../../.gitbook/assets/image (858).png" alt=""><figcaption></figcaption></figure>

### 1.3 Messages

#### 1.3.1 User mentions

Users can be mentioned in messages using @username notation.

<figure><img src="../../.gitbook/assets/image (859).png" alt=""><figcaption></figcaption></figure>

#### 1.3.2 Field References

Fields in a document can be referenced in messages using #fieldname notation.

<figure><img src="../../.gitbook/assets/image (860).png" alt=""><figcaption></figcaption></figure>

Fields in a document can be referenced in messages also using the link button. 

<figure><img src="../../.gitbook/assets/image (861).png" alt=""><figcaption></figcaption></figure>

#### 1.3.3 Attachments

Files can be attached to messages.

<figure><img src="../../.gitbook/assets/image (862).png" alt=""><figcaption></figcaption></figure>

Files, as well as messages, are encrypted and stored in IPFS.

Hedera Topics contain messages with meta-information and links to the corresponding document and attached files.

<figure><img src="../../.gitbook/assets/image (863).png" alt=""><figcaption></figcaption></figure>

## 2. Document Revisions

### 2.1 Configuration

To allow document revision, a corresponding button (requestVcDocumentBlock) must be added. To configure requestVcDocumentBlock to enable editing, the operation type must be set to Edit.

<figure><img src="../../.gitbook/assets/image (686).png" alt=""><figcaption></figcaption></figure>

### 2.2 Events

As with creating a new document, editing a document revision triggers a standard event that saves a new version of the document.

<figure><img src="../../.gitbook/assets/image (720).png" alt=""><figcaption></figcaption></figure>

The old revision of the document is automatically marked as outdated. To hide ‘outdated’ revisions of the documents from the grid, enable “Hide previous versions.”  

<figure><img src="../../.gitbook/assets/image (721).png" alt=""><figcaption></figcaption></figure>

## 3. Access control

Since discussions are published encrypted, keys are required to access (e.g. for audits) their content - comments and attached documents.

### 3.1 Guardian user Permissions

To enable access to all policy artifacts, audit permission in the policy configuration must be assigned to the corresponding user/role.

<figure><img src="../../.gitbook/assets/image (779).png" alt=""><figcaption></figcaption></figure>

### 3.2 Documents

Audit permission allows access to all documents within the policy.

<figure><img src="../../.gitbook/assets/image (783).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (791).png" alt=""><figcaption></figcaption></figure>

#### 3.3 Encryption keys

Audit permission grants access to discussion encryption keys. These keys make it possible to decrypt messages within discussions for verification purposes.

<figure><img src="../../.gitbook/assets/image (843).png" alt=""><figcaption></figcaption></figure>

## 4. Indexer view

Because discussion content is published encrypted, to view their content Indexer users need to provide the corresponding encryption keys.

<figure><img src="../../.gitbook/assets/image (844).png" alt=""><figcaption></figcaption></figure>

When provided, keys are never stored. They are used solely within the current user session to decrypt messages encrypted with the corresponding key, which are automatically identified by the Indexer. 

<figure><img src="../../.gitbook/assets/image (845).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (846).png" alt=""><figcaption></figcaption></figure>
