---
description: Policy developed by TYMLEZ
---

# 🏢 Carbon Emissions Measurement - GHG Corporate Standard Policy Guide

On this page you'll find:

* [Methodologies](carbon-emissions-measurement-ghg-corporate-standard-policy-guide.md#methodologies)
* [Policy Guide](carbon-emissions-measurement-ghg-corporate-standard-policy-guide.md#policy-guide)
  * [For Organizations to create an Employer User (Employer Admin User)](carbon-emissions-measurement-ghg-corporate-standard-policy-guide.md#for-organizations-to-create-an-employer-employer-admin-user)
  * [For Employees to create an Employee User and join an organization](carbon-emissions-measurement-ghg-corporate-standard-policy-guide.md#for-employees-to-create-an-employee-user-and-join-an-organization-employee-users)

**For more Carbon Emissions Measurement - GHG Corporate Standard information, please visit the TYMLEZ-contributed open-source Guardian policy page** [**here**](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CET%20%26%20CRU/Tymlez/policies/Tymlez-CET.policy)

## Methodologies

TYMLEZ aims to provide the capability to quantify and tokenize carbon. To do this, we have designed a universal schema that can be used as the basis for both insetting and avoidance claims made against any GHG Protocol compatible project. Whilst these schemas will not be able to be used verbatim for all carbon registries, they form an important base for digital measurement, reporting, and verification (dMRV) recording against a particular project. A core focus at TYMLEZ is the accurate reading of MRV data from source devices. As such, this schema is not designed for use in scenarios requiring the manual entry of carbon data – we have however included UI screens to support manual entry in this public version.

We have included a full schema for the CET policy [here](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CET%20%26%20CRU/Tymlez/methodologies/CET\_CRU\_TYMLEZ.pdf)[ ](https://github.com/hashgraph/guardian/blob/main/Methodology%20Library/CET%20%26%20CRU/Tymlez/methodologies/CET\_CRU\_TYMLEZ.pdf)that can be used to record Scope 1 & 2 emissions data

\


<figure><img src="../../../.gitbook/assets/image (57) (1).png" alt=""><figcaption></figcaption></figure>

### Scope 3 data

TYMLEZ supports the inclusion of Scope 3 emissions data, however, this is not currently included in the provided schema. We instead integrate with partners to support the inclusion of Scope 3 data as external carbon data which fits the dMRV model more than the usual form-based process.

## Policy Guide

Typically, the way we start the demonstration is by logging in as a Standard Registry. For this demo guide, we will create a user named "Standard Registry."

You'll now be prompted to configure your Standard Registry account. Enter the details and then press the Generate button to generate a Hedera Operator ID and an Operator Key and enter the name of your Standard Registry. Press Connect when finished. This will now create Hedera Consensus Service Topics, fill the account with test hBar, create a DID document, create a Verifiable Credential, etc.

<figure><img src="../../../.gitbook/assets/image (55) (1).png" alt=""><figcaption></figcaption></figure>

Now we will be creating the Policy. We have three ways to "create policies." The first way is to actually create the policy from scratch. The second way is to import an existing policy; either the policy file itself or from IPFS. When you import a policy, all schemas and tokens that are required in the policy are automatically populated. To do this, you can find the policy file and the IPFS timestamp on the open-source Guardian policy page [here](https://github.com/hashgraph/guardian/tree/main/Methodology%20Library/CET%20%26%20CRU/Tymlez/policies). For this demo guide, we will be using the 3rd way to create a policy, which is through the preloaded drop-down list.&#x20;

Once it is selected, we can also preview the policy before importing it. After the policy is imported, we can either run the policy in Dry run mode or we can publish it by clicking on publish button from the dropdown. For testing purposes, we will publish the policy.

Open the policy operations by clicking the "Go" button and add the new site information (the policy does not require a project so leave `ProjectId` as empty)

## Project Owner

Register another new user called the "Project Owner" if it doesn't exist yet.&#x20;

Select the corresponding standard registry for the new Project Owner.

Login as the new owner user

Associate owner with CET (Click on tokens from the nav link and click on the associate button on the table, see picture below)&#x20;

<figure><img src="../../../.gitbook/assets/image (59) (1) (1).png" alt=""><figcaption></figcaption></figure>

&#x20;Open policy `Tymlez CET` and fill in the owner information when the screen has loaded and select role as `TOKEN_OWNER`

<figure><img src="../../../.gitbook/assets/image (32) (2).png" alt=""><figcaption></figcaption></figure>

After confirming the roles, enter the Project Owner information in the dialog.

<figure><img src="../../../.gitbook/assets/image (63) (1).png" alt=""><figcaption></figcaption></figure>

## Installer

Register a new user called an "Installer" and select the corresponding Standard Registry.

Login as the new Installer and finish the setup steps.

Associate owner with CET (Click on tokens from the nav link and click on the associating button on the table, see picture below).

<figure><img src="../../../.gitbook/assets/image (59) (1).png" alt=""><figcaption></figcaption></figure>

Open the policy and fill in the installer information when the screen loads.

Select role as `INSTALLER.`

<figure><img src="../../../.gitbook/assets/image (54) (1).png" alt=""><figcaption></figcaption></figure>

After confirming the roles, enter the owner information in the dialog

<figure><img src="../../../.gitbook/assets/image (66) (1).png" alt=""><figcaption></figcaption></figure>

Download the device config from the list.

The installer can add a new device (meter, sensor, IoT... from devices tabs)

<figure><img src="../../../.gitbook/assets/image (60) (1).png" alt=""><figcaption></figcaption></figure>

Click on `New Sensor` and fill in information for the device. Note that the site-ID is the DID of the Site that was created in the StandardRegistry step earlier in the workflow.

After this step, log in as the StandardRegistry and go to the Sites tab. You can associate the Site to other Sites or check if it is not entered correctly.&#x20;

## Sending MRV

MRV will be injected using external data source API with the below JSON structure

```
{
    "owner": "DID of installer or devices",
    "policyTag": "The policy tag",
     "document": {} 
}
```

**document**: is the full VC document, please refer to (https://github.com/hashgraph/guardian/blob/main/mrv-sender/src/index.ts#L89). The final payload will look like the below:

```
    {
    "owner": "DID",
    "policyTag": "Tag_1666330134735",
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
                "greenhouseGasEmissionsScope": "Scope 1",
                "greenhouseGasEmissionsSource": "DIRECT - STATIONARY COMBUSTION",
                "CO2Emissions": 0.5,
                "CO2eqEmissions": 0.1,
                "CO2eqEmissionsTYMLEZ": 0,
                "emissionsUOM": "t",
                "CO2eqFormula": "$value * 2.70972",
                "tokenOwnerId": "0.0.48700521"
            }
        ],
         "proof" : {
            "type" : "Ed25519Signature2018",
            "created" : "2022-10-21T05:40:13Z",
            "verificationMethod" : "did:hedera:testnet:VX3a6nYMtoaKEvcvqamjeknqb2MSYMd7GHP8RB13bCn;hedera:testnet:tid=0.0.48673640#did-root-key",
            "proofPurpose" : "assertionMethod",
            "jws" : "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..0PjYVmLHl_pL5IYd6XnNv5aSvSduVBaNX7VhWbfNpfdkAtSTKuKsjjBs0CuC3i8l1XIMyRHdm3yn3N4jRS3IAQ"
        }
    }
}
```

## Add MRV using guardian UI

The policy was designed with the policy block that allows `Token Owner` can manually add MRV from guardian UI, we suggest using this for testing purpose only, the real-time data need to be injected via the API method above

Login as Token Owner

Open the policy

Open MRV tabs

Click on `Add MRV` and fill up all the values for your MRV

<figure><img src="../../../.gitbook/assets/image (62) (1).png" alt=""><figcaption></figcaption></figure>

Submit MRV then the new MRV will display in the list, Aggregation will run in the background and respect the token mint rule same with realtime data ingression.

<figure><img src="../../../.gitbook/assets/image (58) (1).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note:&#x20;

* OwnerAccountId: needs to be set to the Hedera Account ID of the Token Owner user. This value can be copied from the profile page
* DeviceID: should be set to Device DID
{% endhint %}

## Verification

After sending MRV using the above API call you can log in as the Standard Registry or Token Owner to view the VP in the Trustchain block.

VP data looks like this:

<figure><img src="../../../.gitbook/assets/image (64).png" alt=""><figcaption></figcaption></figure>

Trustchain viewer looks like this:

<figure><img src="../../../.gitbook/assets/image (65) (1).png" alt=""><figcaption></figcaption></figure>
