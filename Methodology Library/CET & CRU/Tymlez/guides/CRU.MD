## TYMLEZ Carbon Reduction policy
The setup for CRU policy is identical with CET policy, please refer to [TYMLEZ Carbon Emissions](CET.MD) except below steps

### Setup project
- Login as StandardRegistry user
- Open CRU policy
- Enter project information
  
![project](images/cru/1.project.png)


### Sending MRV

We use the similar method to sending MRV as CET policy [CET.MD#Sending MRV](CET.MD#Sending MRV) please note that the MRV schema are not the same the cru payload will look like below example:

```json
{
  "owner": "DID",
  "policyTag": "CRU_POLICY_TAG",
  "document": {
    "id": "{{$guid}}",
    "type": [
      "VerifiableCredential"
    ],
    "issuer": "DID",
    "issuanceDate": "2022-10-22T11:12:43.017Z",
    "@context": [
      "https://www.w3.org/2018/credentials/v1"
    ],
    "credentialSubject": [
      {
        "type": "a305f206-4107-47a6-87fb-571ef7655527&1.0.0",
        "@context": [
          "https://ipfs.io/ipfs/bafkreiarrpieuodeamv4ix75iv4bxp3d6drzdknqaaagwp3x7g2bm73zmy"
        ],
        "readingId": "{{$guid}}",
        "deviceId": "deviceDID",
        "readingDate": "2022-10-22",
        "intervalStartDateTime": "2022-10-22T11:00:00.000Z",
        "intervalEndDateTime": "2022-10-22T11:05:00.000Z",
        "intervalDuration": 300,
        "intervalDurationUOM": "s",
        "value": 0.5,
        "valueUOM": "litre",
        "quality": "HIGH - REAL TIME IOT DEVICE READINGS",
        "CO2eqEmissionsReduction": 0.5,
        "CO2eqEmissionsReductionTYMLEZ": 0.5,
        "emissionsReductionUOM": "ton",
        "CO2eqEmissionsReductionFormulaLink": "https://www.ipcc.ch/assessment-report/ar5/",
        "CO2eqEmissionsReductionFormula": "$CO2Emissions+(CH4Emissions\\times 28)+(N2OEmissions\\times 265)$",
        "tokenOwnerId": "0.0.48700521"
      }
    ],
    "proof": {
      "type": "Ed25519Signature2018",
      "created": "2022-10-21T05:40:13Z",
      "verificationMethod": "did:hedera:testnet:VX3a6nYMtoaKEvcvqamjeknqb2MSYMd7GHP8RB13bCn;hedera:testnet:tid=0.0.48673640#did-root-key",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..0PjYVmLHl_pL5IYd6XnNv5aSvSduVBaNX7VhWbfNpfdkAtSTKuKsjjBs0CuC3i8l1XIMyRHdm3yn3N4jRS3IAQ"
    }
  }
}
```