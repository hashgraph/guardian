# ⛓ TrustChain reports

For a demo example of following steps, here is the policy timestamp: **1675176247.137536341**

## **Task**

Create a report to check a chain of documents.

## **Preparation**

We will use [example 4](mrv-document-operations.md) to assemble multiple documents to build a realistic-looking _Trustchain_.

Let’s add several additional attributes into the documents to simplify the document search.

![Adding Entity](<../../../../.gitbook/assets/0 (3) (1).png>)

![Adding Status](<../../../../.gitbook/assets/1 (3).png>)

![Adding Entity ](<../../../../.gitbook/assets/2 (4) (1).png>)

![Adding Entity](<../../../../.gitbook/assets/3 (4).png>)

![Adding Type Attribute](<../../../../.gitbook/assets/4 (3) (1).png>)

## **Building the trustchain report:**

1. Using the ‘_**reportBlock**_’

1.1 Add new container

![Adding new container](<../../../../.gitbook/assets/5 (2) (2).png>)

1.2 Add ‘_**reportBlock**_’

![Adding reportBlock](<../../../../.gitbook/assets/6 (3) (1).png>)

In Guardian policy ‘**reportBlock**’ finds VP documents based on their _id_ or _hash_ and displays document information, related policy and token information. To retrieve the linked information ‘**reportItemBlock**’ must be used.

1.3 We will build the following chain in this example: **mint **_**VP – MRV Report – Project (approved and signed the the Approver) – Approver document – Project (created and signed by the user) – User document.**_

We will need 6 ‘**reportItemBlock**’ items correspondingly, 1 per each document.

![Adding 6 reportItemBlocks ](<../../../../.gitbook/assets/7 (3).png>)

The ‘**reportItemBlock**’ items are executed sequentially, thus in the filter for each consecutive ‘**reportItemBlock**’ we can use values from the previous blocks/documents.

1.3.1 ‘**mint\_document**’. To find this document which described the token mint operation we will use one of the **Common Variables** - _actionId_

![Using actionId value](<../../../../.gitbook/assets/8 (4) (1).png>)

1.3.2 ’**report\_document**_’_. To find the MRV report (i.e. data document which was the basis of the decision to mint tokens) we will also use one of the **Common Variables** – _documentId_

![Adding documentId value](<../../../../.gitbook/assets/9 (3) (1) (1).png>)

To find further documents we will need to use values from the **Ref** variable which point to the previous document. Let’s save in a new variable:

![Using Ref variable](<../../../../.gitbook/assets/10 (3).png>)

1.3.3 ’**project\_document(approver)**_’_ - Lets use the previously defined variable alongside the static filtration parameters.

![Using previously defined variables](<../../../../.gitbook/assets/11 (5) (1).png>)

Save the author of the document signature so we can display the information about the user later

![Saving document signature](<../../../../.gitbook/assets/12 (4).png>)

**Use the same approach to continue the chain until the end.**

1.3.4 _**’**_**approver\_document**_**’**_

![defining approver\_document block](<../../../../.gitbook/assets/13 (4).png>)

1.3.5 ’**project\_document(user)**_’_

![defining project\_document(user) block](<../../../../.gitbook/assets/14 (3).png>)

1.3.6 ’**user\_document**_’_

![defining user\_document block](<../../../../.gitbook/assets/15 (2).png>)

2. To activate the ‘**reportBlock**’ an id or a hash of the VP document is needed, we will add the grid containing the list of the VP documents and links to the trustchain.

2.1 Add ‘**interfaceContainerBlock**’, ‘**interfaceDocumentsSourceBlock**’ and ‘**documentsSourceAddon**’

![Adding 3 Blocks](<../../../../.gitbook/assets/16 (2).png>)

2.2 Add new column with the type **BUTTON**

![Adding type Button](<../../../../.gitbook/assets/17 (2).png>)

Setting the **Action** to LINK will cause the Policy Engine to attempt to switch the display to the target policy block upon the user clicking the link (if possible).

## **Demo**

### VPs:

<figure><img src="../../../../.gitbook/assets/18 (2).png" alt=""><figcaption></figcaption></figure>

### Trustchain:

<figure><img src="../../../../.gitbook/assets/19 (3).png" alt=""><figcaption></figcaption></figure>
