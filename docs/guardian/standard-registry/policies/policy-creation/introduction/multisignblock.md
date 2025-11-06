# multiSignBlock

This block provides a way to specify multiple signators for a single VC document, and then create a VP based on it.

### 1. Properties

| Block Property   | Definition                                                                                                                                                     | Example Input                                                                  | Status |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| tag              | Unique name for the logic block.                                                                                                                               | **multiSignBlock**                                                             |        |
| permissions      | Which entity has rights to interact at this part of the workflow.                                                                                              | NoRole                                                                         |        |
| defaultActive    | Shows whether this block is active at this time and whether it needs to be shown.                                                                              | Checked or unchecked.                                                          |        |
| On errors        | Called if the system error has occurs in the Block                                                                                                             | <ul><li>No action</li><li>Retry</li><li>Go to step</li><li>Go to tag</li></ul> |        |
| Stop Propagation | End processing here, don't pass control to the next block.                                                                                                     | Checked or unchecked.                                                          |        |
| Threshold (%)    | Proportion Of signators which are required to sign the document to achieve quorum for it to transition to ‘signed’ status. Must be a number between 0 and 100. | 0-100                                                                          |        |

{% hint style="info" %}
**Note:** The system assigns ‘not signed’ status to the document when 100 – threshold percentage of users indicated rejection status.
{% endhint %}

### 2. Events

| Event                         | Description                                                                          | Content                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| SignatureQuorumReachedEvent   | This event occurs when the threshold number (quorum) of signatures has been reached. | now-signed target VC document which can then be used for further processing |
| SignatureSetInsufficientEvent | This event occurs when the threshold number (quorum) of rejections has been achieved | rejected (target) VC document which can be used for further processing      |

### 3. Data Format

#### 3.1 POST request

```
{
	"document":{
		"id":"…" – ID of the VC document
	},
	"status":"SIGNED" – new status, can be SIGNED or DECLINED
}

```

#### 3.2 GET request

```
{
	blockType: "multiSignBlock"
	id:"61ed0335-8b7e-44d9-aedd-0c86c5806442"
	status: {
		confirmationStatus: - final status, it is ‘null’ if the quorum is not reached
		data: [
				{
						username,
						did – did and username of the user which took the decision
						status – the decision of the user, the value space is: SIGNED/DECLINED
		                 }
		       ] 
	         }
}

```

#### Array of the decisions for each user can be as follows:

| Type of Decision  | Description                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| declinedCount     | number of users who declined signing the document                                                          |
| declinedPercent   | percentage of users who declined need signing the document                                                 |
| declinedThreshold | threshold number of users who need to decline signing the document to reach the final decision             |
| documentStatus    | status of the document for the current users, null if the user has not made a selection to sign or decline |
| signedCount       | number of users who have signed the document                                                               |
| signedPercent     | percentage of users who have signed the document                                                           |
| signedThreshold   | threshold number of users who need to sign the document to reach the final decision                        |
| threshold         | threshold in terms of percentage                                                                           |
| total             | total number of users in the signing group                                                                 |

### 4. Example

#### 4.1 Important Points

4.1.1 multiSignBlock must be used with Groups.

<figure><img src="../../../../../.gitbook/assets/image (13) (1) (1) (2) (1).png" alt=""><figcaption></figcaption></figure>

4.1.2 multiSignBlock must be child block of grid block to receive all data it requires to operate.

<figure><img src="../../../../../.gitbook/assets/image (31).png" alt=""><figcaption></figcaption></figure>

### 5. UI

#### 5.1 Signing the document

We have an option of Signing/ Declining the document by clicking on "Sign" or "Decline" button for the document as shown below:

<figure><img src="../../../../../.gitbook/assets/image (20) (2) (1).png" alt=""><figcaption></figcaption></figure>

#### 5.2 Threshold Display

Number of users, who have signed or declined the document can be displayed with threshold as shown below:

<figure><img src="../../../../../.gitbook/assets/image (29) (1).png" alt=""><figcaption></figcaption></figure>

#### 5.3 Detailed Signature Information

To get detailed information on Signature status, we have an info icon near the threshold as shown below:

<figure><img src="../../../../../.gitbook/assets/image (19) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

#### 5.4 Final Signature Result

To get the final Signature Result with detailed information such as which users have Signed / Declined, we need to hover on the Status as shown below:

<figure><img src="../../../../../.gitbook/assets/image (1) (3) (2) (1).png" alt=""><figcaption></figcaption></figure>

### API Parameters

<mark style="color:blue;">`GET`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

{% tabs %}
{% tab title="200: OK Successful Operation" %}
```javascript
{
  "id": "1c922d1a-7f9d-492f-b0f9-f319eb2b66be",
  "blockType": "multiSignBlock"
}

```
{% endtab %}
{% endtabs %}

<mark style="color:green;">`POST`</mark> `/policies/{policyId}/blocks/{uuid}`

#### Path Parameters

| Name                                       | Type   | Description |
| ------------------------------------------ | ------ | ----------- |
| policyId<mark style="color:red;">\*</mark> | String | Policy ID   |
| uuid<mark style="color:red;">\*</mark>     | String | Block UUID  |

#### Request Body

| Name                                       | Type   | Description     |
| ------------------------------------------ | ------ | --------------- |
| status<mark style="color:red;">\*</mark>   | String | Signed/Declined |
| document<mark style="color:red;">\*</mark> | Object | VC Document     |
