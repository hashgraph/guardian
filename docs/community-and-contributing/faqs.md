---
tags:
  - flagged-for-rewrite
---

# FAQs

{% hint style="warning" %}
This page is flagged to be updated. Don't see your questions listed? Send an inquiry to guardian-feedback@hashgraph.com
{% endhint %}

**1.How can I get started with the Guardian?**

To get started you can choose from one of the following options depending upon your level of technical experience.

<table><thead><tr><th width="255.2109375">Option</th><th width="197.64453125">Format</th><th>Technical Complexity</th></tr></thead><tbody><tr><td><a href="https://www.climission.com/mgs">Managed Guardian Service</a></td><td>SaaS / Free Trial</td><td>Low</td></tr><tr><td><a href="https://github.com/hashgraph/guardian/#quickstart">Quickstart guide</a></td><td>Docker containers</td><td>Medium</td></tr><tr><td><a href="https://github.com/hashgraph/guardian/#getting-started">Building from source</a></td><td>Source code</td><td>High</td></tr></tbody></table>

**2. How can I create a policy?**

You can use the policy editor or APIs to create a policy workflow. Some examples can be found in [Methodology Digitization](https://app.gitbook.com/s/bKnJV8vV7zUxRwKIsJKg/methodology-digitization "mention") and [creating-a-policy-through-policy-configurator](../guardian/workspace/policies/policy-creation/creating-a-policy-through-policy-configurator/ "mention")here and there is a quick start guide to help you publish your first policy.

**5. Where can I get notified of updates, trainings, and workshops?**

[Subscribe to the community calendar](https://lu.ma/guardian).

**6. Where can I see the most recent changes made to the Guardian?**

Learn more about past releases here, [https://github.com/hashgraph/guardian/releases](https://github.com/hashgraph/guardian/releases).&#x20;

**7. How do I request a policy or an issue to be worked on?**

You can submit an issue in our Github or directly email us at info@envisionblockchain.com.

**8. Whats the difference between iREC Policy and iREC Policy 2 in demo artifacts?**

iREC Policy 2 is the up-to-date version of iREC Policy

**9. How do I launch the IoT simulator in the reference implementation to generate demo MRV data?**

You can visit : http://localhost:3000/mrv-sender/

**10. How can I access the API docs?**

On the docs site, checkout the [API Reference / guardian](https://app.gitbook.com/o/-LuC734MpqlgwA6zyhAO/s/qHzrfhYRf3qLjeOsZTmp/ "mention")

When running via docker, navigate to [https://localhost/api/v1/api-docs](https://localhost/api/v1/api-docs).&#x20;

**11. Why do I get the error INSUFFICENT\_TX\_FEE?**

The fee in the transaction is too small and needs to be increased changing setting of **MAX\_TRANSACTION\_FEE**

**14. How are we linking topics to stored ipfs data after mongodb goes away? Is there somewhere I can read this?**

MongoDB does not go away, we will keep the local DB for drafts etc. Hedera messages in topics are linked to the ‘published’ policies which are immutable stored in IPFS - messages contain CID of the file in IPFS.

**15. How Guardian uses IPFS for Verifiable Presentation (VP) storage?**

We are uploading Verifiable Presentation document to IPFS and CID will be attached in Hedera message which is linked to policy topic.

**16. How does Guardian Provenance works?**

(ONLY NFT) Open tokens page, click on appropriate token or open ledger works explorer manually https://explore.lworks.io/testnet/tokens/{tokenId} ([https://explore.lworks.io/testnet/tokens/0.0.4554172](https://explore.lworks.io/testnet/tokens/0.0.4554172)), open "NFT HOLDERS" tab and click on appropriate serial, click on "OVERVIEW" tab and in metadata you can get VP message identifier (1721049137.243457003).

(FT, NFT) Open tokens page, copy appropriate token identifier, open Dragonglass explorer https://testnet.dragonglass.me/tokens/{tokenId} ([https://testnet.dragonglass.me/tokens/0.0.4554298](https://testnet.dragonglass.me/tokens/0.0.4554298)), click on "All transactions" tab, click on appropriate mint transaction, in memo you can get VP message identifier (1721049808.933544003).

In our case it will be [https://testnet.mirrornode.hedera.com/api/v1/topics/messages/1721049137.243457003](https://testnet.mirrornode.hedera.com/api/v1/topics/messages/1721049137.243457003)\
You will get a message content:

```
{
  "chunk_info": {
    "initial_transaction_id": {
      "account_id": "0.0.3652792",
      "nonce": 0,
      "scheduled": false,
      "transaction_valid_start": "1721049124.634107712"
    },
    "number": 1,
    "total": 1
  },
  "consensus_timestamp": "1721049137.243457003",
  "message": "eyJpZCI6IjA1NTJlZDQzLWUyZWItNDM1OC05YzZjLWEwNzRlNzU1ZWRhYiIsInN0YXR1cyI6IklTU1VFIiwidHlwZSI6IlZQLURvY3VtZW50IiwiYWN0aW9uIjoiY3JlYXRlLXZwLWRvY3VtZW50IiwibGFuZyI6ImVuLVVTIiwiaXNzdWVyIjpudWxsLCJyZWxhdGlvbnNoaXBzIjpbIjE3MjEwNDkxMjAuNTM1MTQwODYzIiwiMTcyMTA0OTEyOC41OTM0NDcwMDMiXSwiY2lkIjoiYmFma3JlaWdmejd6cmlxMnlhemJrajViczR2ZTVnbHlkbTZ0aXFiamdnZmhkYjJnNHZjb2k1aG9oc2EiLCJ1cmkiOiJpcGZzOi8vYmFma3JlaWdmejd6cmlxMnlhemJrajViczR2ZTVnbHlkbTZ0aXFiamdnZmhkYjJnNHZjb2k1aG9oc2EifQ==",
  "payer_account_id": "0.0.3652792",
  "running_hash": "BKgO/4+20/lpmgdqCUGyW4icZyplhfOwPsvozHQwTc3BQl4jfDTjkKgQDRyj7Naf",
  "running_hash_version": 3,
  "sequence_number": 9,
  "topic_id": "0.0.4554253"
}
```

Take the `message` attribute value and parse it to a JSON representation:\
`JSON.parse(atob(message)) // JSON.parse(atob(eyJpZCI6IjEzN.........WFuaDZ2eWEifQ==))`\
You will have a JSON similar to that one:

```
{
	"id": "1356e03a-994a-4e9d-b51f-ce0f870fd952",
	"status": "ISSUE",
	"type": "VP-Document",
	"action": "create-cp-document",
	"issuer": null,
	"relationships": [
		"1649942496.010211000"
	],
	"cid": "bafkreia5i3brumci35s733q4gua363ihxrisr6nziaf7h7hgxhyanh6vya",
	"url": "https://ipfs.io/ipfs/bafkreia5i3brumci35s733q4gua363ihxrisr6nziaf7h7hgxhyanh6vya"
}
```

Take the `url` attribute value and paste it to a browser:\
[https://ipfs.io/ipfs/bafkreia5i3brumci35s733q4gua363ihxrisr6nziaf7h7hgxhyanh6vya](https://ipfs.io/ipfs/bafkreia5i3brumci35s733q4gua363ihxrisr6nziaf7h7hgxhyanh6vya)\
You’ll have a VP of this token.

```
{
  "id": "db698146-38e2-48f6-8819-6f596647f970",
  "type": [
    "VerifiablePresentation"
  ],
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "verifiableCredential": [
    {
      "id": "2f6ca45d-7f0d-405a-a011-b736db93e511",
      "type": [
        "VerifiableCredential"
      ],
      "issuer": "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893",
      "issuanceDate": "2022-04-14T13:21:28.918Z",
      "@context": [
        "https://www.w3.org/2018/credentials/v1"
      ],
      "credentialSubject": [
        {
          "field0": "did:hedera:testnet:F55HnMGMzS3TkuqBjLaUxcYvm86oGfTFViXELD4GNFAo;hedera:testnet:tid=0.0.34194893",
          "field1": "did:hedera:testnet:8jjgRqbr2YRYccxMrvhupyu543izSe8N1J6UHbgWkhiA;hedera:testnet:tid=0.0.34204397",
          "field2": {
            "type": "706bb8da-7f39-4518-85c3-b4b23a6ef28a",
            "@context": [
              "https://ipfs.io/ipfs/bafkreidcyabsha6frnfqie7bpa5o3yrb6cllglsxd4krjksvreg35ygluy"
            ]
          },
          "field3": {
            "type": "64c171a2-ac60-4972-b796-8596381c65a8",
            "@context": [
              "https://ipfs.io/ipfs/bafkreidcyabsha6frnfqie7bpa5o3yrb6cllglsxd4krjksvreg35ygluy"
            ]
          },
          "field6": "2022-04-07",
          "field7": 1,
          "field8": "2022-04-28",
          "field17": "nu81uxel",
          "field18": "0.0.34194895",
          "ref": "did:hedera:testnet:8jjgRqbr2YRYccxMrvhupyu543izSe8N1J6UHbgWkhiA;hedera:testnet:tid=0.0.34204397",
          "policyId": "62581e42a7303b7ff96a8012",
          "@context": [
            "https://ipfs.io/ipfs/bafkreidcyabsha6frnfqie7bpa5o3yrb6cllglsxd4krjksvreg35ygluy"
          ],
          "id": "6a730bc5-19e2-427d-b132-b9b49359ea20",
          "type": "143e109a-a089-48a1-8a7b-534bfaf79c4d&1.0.0"
        }
      ],
      "proof": {
        "type": "Ed25519Signature2018",
        "created": "2022-04-14T13:21:28Z",
        "verificationMethod": "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893#did-root-key",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..hw6O674MalfXIlD3RyOd1BLhvH_xBYIudK1UQ-cAvZxYYejdMjU2TYfjC-sUa7ZYcioZ_CfSBsMwI7WCO3hGAw"
      }
    },
    {
      "id": "c0c0d496-4f86-4ca9-94cc-80552d838168",
      "type": [
        "VerifiableCredential"
      ],
      "issuer": "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893",
      "issuanceDate": "2022-04-14T13:21:36.139Z",
      "@context": [
        "https://www.w3.org/2018/credentials/v1"
      ],
      "credentialSubject": [
        {
          "date": "2022-04-14T13:21:36.134Z",
          "tokenId": "0.0.34194898",
          "amount": "1",
          "@context": [
            "https://ipfs.io/ipfs/bafkreiaamzhmh3l5pn5nneib5yifb3gjwlotf6fr6vb65j7tfi4tefxcza"
          ],
          "type": "MintToken&1.0.0"
        }
      ],
      "proof": {
        "type": "Ed25519Signature2018",
        "created": "2022-04-14T13:21:36Z",
        "verificationMethod": "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893#did-root-key",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..3uhxt-NAuLaIGTDXlqkD92QOTUZOjJgHNjFwP6jrrGchFLwxuDDnhz5VzMMLv1k3_VkVLvIKx1V-E1aewSI5Bw"
      }
    }
  ],
  "proof": {
    "type": "Ed25519Signature2018",
    "created": "2022-04-14T13:21:36Z",
    "verificationMethod": "did:hedera:testnet:9ZJXR58X9XQUgwiuxQQiTUt5yY2vX2Tw5Uph4xXsnkfM;hedera:testnet:tid=0.0.34194893#did-root-key",
    "proofPurpose": "authentication",
    "challenge": "123",
    "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..-yNpvBHaDnFk-T5OWY516WBsBnsE40E-4-z-d54BhwanRBN15D6VbKGUjRG4kkKhEp-7jh8WIO2VRsYY4-SOBQ"
  }
}
```

**17. The VCs that are generated as part of the Guardian workflow, have you found any use cases where the status of the VC might change? For example, is there ever a time where a VC might be revoked or expires? If so, does the status get updated on the ledger?**

There are many use-cases where the VCs and various other artefacts produced in the course of the policy functioning of the guardian might need to be revoked. One of the obvious examples of such situation is malfunctioning sensor generating invalid MRV data. But there are many others.

**18. Is it possible to see a Guardian-minted token's value in HBAR as well as its associated CO2e? If so, where does this information come from/how can we access it?**

The value of the token in HBAR (or USD) will be set by the market, and thus external to the token itself (so there is no way to see in the token what it is worth in dollars). And what the token represents (CO2e etc) is determined by the policy under which it was minted. These tokens are the NFTs, and the metadata can include this data if the policy under which the tokens are minted has provisions for it.

**19. What is the semantic of the DID in the message? Is it that the standard registry signs VCs etc with the corresponding private key?**

DID is the the DID of the RA, i.e. is a globally unique reference linking to a DID document which is the identity - all VCs issued to or by an entity would then be ‘bound’ to this DID as per the ‘self-sovereign identity’ architecture.

**20. How to identify data on Hedera after submitting data using sendToGuardianBlock?**

You can find it in Project/Policy topic, it depends on sendToGuardianBlock configuration.

Open policies tab, click on policy topic or open it in ledger works explorer manually https://explore.lworks.io/testnet/topics/{topicId} ([https://explore.lworks.io/testnet/topics/0.0.4554074](https://explore.lworks.io/testnet/topics/0.0.4554074)), find appropriate INSTANCE\_POLICY\_TOPIC message and copy childId, then replace it in the url, find appropriate message or find appropriate DYNAMIC\_TOPIC message and do same thing with childId.

Unfortunately, Ledger Works does not have a search by messageId, but messages can be obtained using mirror node.

for example https://testnet.mirrornode.hedera.com/api/v1/topics/messages/1659539040.128851003
