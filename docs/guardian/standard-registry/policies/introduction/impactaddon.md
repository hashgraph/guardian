# impactAddon

This Addon for the mint block which allows to add additional info for the token being created.

### 1. Properties

<table><thead><tr><th width="200.33333333333331">Property Name</th><th>Description</th><th>Example</th><th>Status</th></tr></thead><tbody><tr><td>Tag</td><td>Unique name for the logic block.</td><td>impactAddon_1</td><td></td></tr><tr><td>Permissions</td><td>Which entity has rights to interact at this part of the workflow.</td><td>Standard Registry</td><td></td></tr><tr><td>Default Active</td><td>Shows whether this block is active at this time and whether it needs to be shown.</td><td>Checked or UnChecked</td><td></td></tr><tr><td>Stop Propagation</td><td>End processing here, don't pass control to the next block.</td><td>Checked or UnChecked</td><td></td></tr><tr><td>On Errors</td><td>Called if the system error has occurs in the Block</td><td><ul><li>No action</li></ul><ul><li>Retry</li></ul><ul><li>Go to step</li></ul><ul><li>Go to tag</li></ul></td><td></td></tr><tr><td>Impact Type</td><td>shows the type of the impact</td><td>Primary Impacts / Secondary Impacts</td><td></td></tr><tr><td>Label</td><td>Title of the Impact</td><td>Test</td><td></td></tr><tr><td>Description</td><td>Description of the impact</td><td>Impact description</td><td></td></tr><tr><td>Amount (Formula)</td><td>Formula for calculating the impact quantitative representation based on the data from the source VC</td><td>field0</td><td></td></tr><tr><td>Unit</td><td>Unit of measurement of impact amounts</td><td>Kg</td><td></td></tr></tbody></table>

<figure><img src="../../../../.gitbook/assets/image (1) (3) (1).png" alt=""><figcaption></figcaption></figure>

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

2.2 All source VCs are substituted for a single cumulative VC containing links to the source (original) VCs.

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
