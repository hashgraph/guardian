# reportBlock & reportItemBlock

## reportBlock

### 1. Properties

| Block Property | Definition                                                                        | Example Input                      | Status |
| -------------- | --------------------------------------------------------------------------------- | ---------------------------------- | ------ |
| type           | Type of workflow logic                                                            | **reportBlock**(Can't be changed). |        |
| tag            | Unique name for the logic block.                                                  | report.                            |        |
| permissions    | Which entity has rights to interact at this part of the workflow.                 | Standard Registry.                 |        |
| defaultActive  | Shows whether this block is active at this time and whether it needs to be shown. | Checked or unchecked.              |        |

### 2. Impacts Section

We have added new Impacts Section to display Primary/Secondary Impacts token details in Trustchain:

<figure><img src="../../../../../.gitbook/assets/image (1) (5).png" alt=""><figcaption></figcaption></figure>

In the case when multiple linked mint blocks are used then the system displays all linked VPs as shown below:

<figure><img src="../../../../../.gitbook/assets/image (2) (1) (3) (2) (1).png" alt=""><figcaption></figcaption></figure>

#### 2.1 Data Format:

Ingress Document has following sections:

| Document Type         | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| vpDocument            | VP document found based on its hash                           |
| vcDocument            | VC document found based on its hash                           |
| impacts (new)         | array of Impacts (VCs) if exist                               |
| mintDocument          | VC document describing the mint                               |
| policyDocument        | VC document describing the policy                             |
| policyCreatorDocument | VC document describing the Standard Registry                  |
| documents             | collection of VC documents retrieved from the reportItemBlock |
| additionalDocuments   | array of VPs linked with the selected document                |

### 3. Token Transfer Section

Token transfer, which shows how much tokens is already transferred (will display only when transfer is needed)

<figure><img src="../../../../../.gitbook/assets/image (586).png" alt=""><figcaption></figcaption></figure>

### Events

| Property Name | Name in JSON | Property Value                                                    | Value in JSON                          | Description                                                                                                                     |
| ------------- | ------------ | ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Event Type    | -            | <p>Input Event</p><p>Output Event</p>                             | -                                      | Type of the event - determines whether this is ingress or egress event for the current block.                                   |
| Source        | "source"     | Block tag(string)                                                 | "block\_tag"                           | The block which initiates the event.                                                                                            |
| Target        | "target"     | Block tag(string)                                                 | "block\_tag"                           | The block which receives the event.                                                                                             |
| Output Event  | "output"     | Event name(string)                                                | "event\_name"                          | Action or issue that caused the event.                                                                                          |
| Input Event   | "input"      | Event name(string)                                                | "event\_name"                          | Action which will be triggered by the event.                                                                                    |
| Event Actor   | "actor"      | <p>Event Initiator</p><p>Document Owner</p><p>Document Issuer</p> | <p>""</p><p>"owner"</p><p>"issuer"</p> | Allows to transfer control of the block (execution context) to another user. Empty field leaves control at the Event Initiator. |
| Disabled      | "disabled"   | True/False                                                        | true/false                             | Allows to disable the event without deleting it.                                                                                |

To know more information about events, please look at [Events](events.md).

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
  "hash": "BV4VxNEGvBjodqZ6KWCoV6r4xks4LYSGu8mjWyXLLX52",
  "data": {
    "vpDocument": {
      "type": "VP",
      "title": "Verifiable Presentation",
      "tag": "mint_token",
      "hash": "BV4VxNEGvBjodqZ6KWCoV6r4xks4LYSGu8mjWyXLLX52",
      "issuer": "did:hedera:testnet:7Q9aPi8rEhceMGMqviCdya9APf515YVbtiyjHrHYPh5N_0.0.3075949",
      "username": "Virtual User 1",
      "document": {
        "_id": "63da2203db84efbb04da45a7",
        "dryRunId": "63da04e19670adb07f82b092",
        "dryRunClass": "VpDocumentCollection",
        "owner": "did:hedera:testnet:7Q9aPi8rEhceMGMqviCdya9APf515YVbtiyjHrHYPh5N_0.0.3075949",
        "hash": "BV4VxNEGvBjodqZ6KWCoV6r4xks4LYSGu8mjWyXLLX52",
        "document": {
          "id": "urn:uuid:0bb9966d-bbce-4e7d-a943-21c7d6283adc",
          "type": [
            "VerifiablePresentation"
          ],
          "@context": [
            "https://www.w3.org/2018/credentials/v1"
          ],
          "verifiableCredential": [
            {
              "id": "urn:uuid:7aeb978a-01bf-4ceb-be52-33997832e32d",
              "type": [
                "VerifiableCredential"
              ],
              "issuer": "did:hedera:testnet:9jShvNUsztLFbvEK442VPfkccLYW3F2oU3e6rCHzr7FT_0.0.3075949",
              "issuanceDate": "2023-02-01T08:25:38.804Z",
              "@context": [
                "https://www.w3.org/2018/credentials/v1"
              ],
              "credentialSubject": [
                {
                  "field0": "did:hedera:testnet:7Q9aPi8rEhceMGMqviCdya9APf515YVbtiyjHrHYPh5N_0.0.3075949",
                  "field1": "did:hedera:testnet:EHXwuE486eSD4yGXr6qTNLstmb8H1B2Jn4kx3PeWZzjv_0.0.1675232535045",
                  "field2": {
                    "field0": "Organization Name",
                    "type": "dee7e78b-44b8-4bb0-8be0-3a86bde752b2",
                    "@context": []
                  },
                  "field3": {
                    "field0": "device1",
                    "type": "b61a05c6-bb1a-4d7e-9299-c0932d8c0306",
                    "@context": []
                  },
                  "field6": "2023-02-01",
                  "field7": 1,
                  "field8": "2023-02-01",
                  "field17": "StandardRegistry",
                  "field18": "0.0.3075944",
                  "policyId": "63da04e19670adb07f82b092",
                  "ref": 
"did:hedera:testnet:EHXwuE486eSD4yGXr6qTNLstmb8H1B2Jn4kx3PeWZzjv_0.0.1675232535045",
                  "@context": [
                    "schema#80b8a663-8dec-411f-83fd-6e4cb7170427"
                  ],
                  "id": "urn:uuid:bdc30a12-443f-43a1-b1ff-05fdb4d39017",
                  "type": "80b8a663-8dec-411f-83fd-6e4cb7170427"
                }
              ],
              "proof": {
                "type": "Ed25519Signature2018",
                "created": "2023-02-01T08:25:38Z",
                "verificationMethod": "did:hedera:testnet:9jShvNUsztLFbvEK442VPfkccLYW3F2oU3e6rCHzr7FT_0.0.3075949#did-root-key",
                "proofPurpose": "assertionMethod",
                "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..hcXXdjwaicZzXlUraPIaQqEpMkt9tRYJWAEMX8j8ipXUcrh1dgTDeHxHmVfxOrpOaxqgoo2Sf2VltQi8FRjvBA"
              }
            },
            {
              "id": "urn:uuid:c6ae4294-bd77-43ec-9389-f0c1a9bbc830",
              "type": [
                "VerifiableCredential"
              ],
              "issuer": "did:hedera:testnet:9jShvNUsztLFbvEK442VPfkccLYW3F2oU3e6rCHzr7FT_0.0.3075949",
              "issuanceDate": "2023-02-01T08:25:38.920Z",
              "@context": [
                "https://www.w3.org/2018/credentials/v1"
              ],
              "credentialSubject": [
                {
                  "date": "2023-02-01T08:25:38.917Z",
                  "tokenId": "0.0.3120996",
                  "amount": "1",
                  "@context": [
                    "ipfs://bafkreib67gunqam5jcv6xx3ioapfzyrnvte5wvpmcq56emso5acckercae"
                  ],
                  "type": "MintToken"
                }
              ],
              "proof": {
                "type": "Ed25519Signature2018",
                "created": "2023-02-01T08:25:38Z",
                "verificationMethod": 
.....
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

| Name                                          | Type   | Description |
| --------------------------------------------- | ------ | ----------- |
| filterValue<mark style="color:red;">\*</mark> | String | VP Hash     |

## reportItemBlock

### Properties

| Block Property  | Definition                                                                                                                                                                              | Example Input                                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title           | Title of the element                                                                                                                                                                    | Report                                                                                                                                                                                                                                                     |
| Description     | Description of the element                                                                                                                                                              | Reporting                                                                                                                                                                                                                                                  |
| Visibility      | Visibility of the element. False if there is a need to build a chain of elements which must not be shown                                                                                | False                                                                                                                                                                                                                                                      |
| Multiple        | which allows store multiple documents in Report Item                                                                                                                                    | True                                                                                                                                                                                                                                                       |
| Filters         | Array of filters for the VC for this element                                                                                                                                            | <p>"filters": [</p><p>{</p><p>"field": "document.id", "value": "actionId", "typeValue": "variable", "type": "equal"</p><p>},</p><p>{</p><p>"typeValue": "value",</p><p>"field": "type",</p><p>"type": "equal",</p><p>"value": "report"</p><p>}</p><p>]</p> |
| Dynamic Filters | We can set “Field Path” (in current Report Item Document\[s]), “Next Item Field Path” and “Type” (Filter Type) to filter documents in Report Items dynamically directly in trust chain. | Type                                                                                                                                                                                                                                                       |
| Variables       | List of common variables. It gets filled in in the process of the transition from one reportItemBlock to the next                                                                       | <p>"variables": [</p><p>{</p><p>"value":"document.credentialSubject.0.ref",</p><p>"name": "projectId"</p><p>}</p><p>]</p>                                                                                                                                  |

A new variable projectId will be created which would be assigned the value from document.credentialSubject.0.ref.
