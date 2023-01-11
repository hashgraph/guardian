# impactAddon

This Addon for the mint block which allows to add additional info for the token being created.

### 1. Properties

| Property Name    | Description                                                                                         | Example                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Tag              | Unique name for the logic block.                                                                    | impactAddon\_1                                                                                            |
| Permissions      | Which entity has rights to interact at this part of the workflow.                                   | Standard Registry                                                                                         |
| Default Active   | Shows whether this block is active at this time and whether it needs to be shown.                   | Checked or UnChecked                                                                                      |
| Stop Propagation | End processing here, don't pass control to the next block.                                          | Checked or UnChecked                                                                                      |
| On Errors        | Called if the system error has occurs in the Block                                                  | <ul><li>No action</li></ul><ul><li>Retry</li></ul><ul><li>Go to step</li></ul><ul><li>Go to tag</li></ul> |
| Impact Type      | shows the type of the impact                                                                        | Primary Impacts / Secondary Impacts                                                                       |
| Label            | Title of the Impact                                                                                 | Test                                                                                                      |
| Description      | Description of the impact                                                                           | Impact description                                                                                        |
| Amount (Formula) | Formula for calculating the impact quantitative representation based on the data from the source VC | field0                                                                                                    |
| Unit             | Unit of measurement of impact amounts                                                               | Kg                                                                                                        |



<figure><img src="../../../../.gitbook/assets/image (1) (3) (3).png" alt=""><figcaption></figcaption></figure>

### 2. Data Format

Adding impactAddon changes VP documents such that:

2.1 New VC documents are added for each impact describing it

```
{
    "id": "732d46ca-1e19-43a2-a4b1-49cf5ea08aa9",
    "type": [
        "VerifiableCredential"
    ],
    "issuer": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.49039174",
    "issuanceDate": "2022-12-06T11:27:37.964Z",
    "@context": [
        "https://www.w3.org/2018/credentials/v1"
    ],
    "credentialSubject": [
        {
            "@context": [
                "ipfs://bafkreiabgmqbzd4s2u2jy74ebkawbtvs3ohc76qhphx4vvuymskpfmjj2u"
            ],
            "type": "ActivityImpact",
            "impactType": "Primary Impacts",
            "date": "2022-12-06T11:27:37.959Z",
            "amount": "2000",
            "unit": "kg",
            "label": "Test 1",
            "description": "Test Description 1"
        }
    ],
    "proof": {
        "type": "Ed25519Signature2018",
        "created": "2022-12-06T11:27:37Z",
        "verificationMethod": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.49039174#did-root-key",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..nK_fvwC9nW9jtKHm2U4yAHhIcgpGCkr1H7PiPNwKzAj9gW2sblpu0TAQEow9OR9v1aREEH-fFLmyAGEfXWfXAw"
    }
}

```

2.2  All source VCs are substituted for a single cumulative VC containing links to the source (original) VCs.

```
{
    "id": "443e9e7b-3a67-4ad9-a22d-d85c2d28562f",
    "type": [
        "VerifiableCredential"
    ],
    "issuer": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.49039174",
    "issuanceDate": "2022-12-06T11:27:37.936Z",
    "@context": [
        "https://www.w3.org/2018/credentials/v1"
    ],
    "credentialSubject": [
        {
            "@context": [
                "ipfs://bafkreicnjditzstltfyu2327pqqcstuwl5vegwe2hepbwcque2gjvwsm3y"
            ],
            "type": "TokenDataSource",
            "dataSource": [
                "1670.326057800",
                "1670.451857512"
            ]
        }
    ],
    "proof": {
        "type": "Ed25519Signature2018",
        "created": "2022-12-06T11:27:37Z",
        "verificationMethod": "did:hedera:testnet:BJDCUTd8gFSaFwW4w7Tw8dbx7DfnkfLjJ14s2dquesS9_0.0.49039174#did-root-key",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..N5sOQOgxBxPdvGvCJbfJ4rWBc6374Ht96xKTAN6Pwrhr8Pk4SWqS6IwDePBySTIbvVETPFFxjzGQZMsbENx5BA"
    }
}

```
