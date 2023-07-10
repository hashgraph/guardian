# ➗ MRV aggregation and splitting for minting tokens

For a demo example of following steps, here is the policy timestamp: **1675266693.102366003**

## Adding aggregateDocumentBlock in separate containerAdding aggregateDocumentBlock in separate container**Task**

MRV documents feature a numerical measurement field. The values in this field are periodically aggregated, in this example we will use 1 minute period.

The purpose of the aggregation is to mint tokens, in this example 1 token will be minted for each part which equal to 1000 of the aggregated value.

## **Preparation**

Create a token and 2 schemas (**User** and **Report**). For simplicity the token will not require a KYC.

Build the first part of the document entry:

![image1.png](<../../../../.gitbook/assets/0 (3).png>)

_(Please see_ [_examples 2_](data-input-via-forms-using-roles-to-partition-user-activities..md) _and_ [_3_](token-operations.md) _for more detailed description of this)_

### **Aggregate:**

1. Add ‘**aggregateDocumentBlock**' after saving the document in the database. This is the block which would accumulate documents/values until the condition is met (which in this case is the event from the timer).

1.1 Put '**aggregateDocumentBlock**' in a separate container to avoid it from interfering with the working of  '**interfaceStepBlock**'

![Adding aggregateDocumentBlock](<../../../../.gitbook/assets/1 (4).png>)

![Adding aggregateDocumentBlock in separate container](<../../../../.gitbook/assets/2 (4).png>)

1.2 Pass the document to the ‘_**aggregateDocumentBlock**_' after it is saved.

![Passing the saved document to the aggregateDocumentBlock](<../../../../.gitbook/assets/3 (5) (1).png>)

2. Timer is a separate block called '_**timerBlock**_'

2.1 For each user there is a separate timer execution context (i.e., each user has an independent timer). For this it requires a document owned by the user to be passed into this. To ensure this, let’s add the timer immediately after user registration.

![Adding timerBlock after user registration](<../../../../.gitbook/assets/4 (3).png>)

2.2 Set the timer to trigger every minute

![Setting the timer for every minute](<../../../../.gitbook/assets/5 (2).png>)

2.3 Now after the timer is launched, it would create a ‘**TimerEvent**’ periodically every minute. And then connect it with ‘_**aggregateDocumentBlock**_':

![Connecting TimerBlock with aggregateDocumentBlock](<../../../../.gitbook/assets/6 (3).png>)

### **Split:**

1. To split the document into equal parts, add '_**splitBlock**_'

1.1 Add '_**splitBlock**_' immediately after the '_**aggregateDocumentBlock**_'

![Adding splitBlock after aggregateDocumentBlock](<../../../../.gitbook/assets/7 (4).png>)

1.2 Configure the document field which would be used for splitting/aggregation

![Configuring Source Field](<../../../../.gitbook/assets/8 (4) (2).png>)

1.3 Set a ‘**Threshold**’ to configure the value for splitting the document.

<figure><img src="../../../../.gitbook/assets/9 (3) (1).png" alt=""><figcaption><p>Setting the Threshold for split</p></figcaption></figure>

### **Mint:**

Add '_**mintDocumentBlock**_' immediately after ‘_**splitBlock**_' to mint tokes and configure the minting rule

![Adding mintDocumentBlock after splitBlock](<../../../../.gitbook/assets/10 (4).png>)
