# Bring your own (BYO) DIDs UI

1. [Step By Step Process](bring-your-own-byo-dids-ui.md#id-1.-step-by-step-process)
2. [Demo Video](bring-your-own-byo-dids-ui.md#id-2.-demo-video)

## 1. Step By Step Process

## 1. New Standard Registry Registration

### **1.1 Hedera Account**

<figure><img src="../../../.gitbook/assets/image (30) (3).png" alt=""><figcaption></figcaption></figure>

Enter Hedera network account with non-0 hbar balance to be used by the system for the Hedera transactions associated with the new Standard Registry user’s DID.

### 1.2 DID Document

#### 1.2.1 Default DID

<figure><img src="../../../.gitbook/assets/image (2) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

When the ‘Generate new DID document’ option is selected, clicking on the Next button would result in Guardian generating a new dedicated DID to be used exclusively in Guardian based on the Hedera account ID entered at the previous step. Such DID would have the following format:

```
“did:hedera:{network}:{identifier}_{topicId}”
```

```
Example:

"did:hedera:testnet:DZv8hKg4nsdS7qSAtUdmBgvcq5iiZ6E1aCWZvqJzNNbV_0.0.2666979"

```

#### 1.2.2 Externally-controlled (custom) DID

<figure><img src="../../../.gitbook/assets/image (3) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (2) (1) (1).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (4) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Selecting ‘Custom DID document’ option enables the dialogue text window where the externally-generated/controlled DID document can be pasted from the clip-board. The document must contain Ed25519VerificationKey2018 and Bls12381G2Key2020 verification methods to be useable by Guardian.

### 1.3 Keys

<figure><img src="../../../.gitbook/assets/image (6) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

For BYO DID of Standard Registries, in the cases where there are multiple verification methods Standard Registry users are required to specify which one of them is to be used in Guardian, and pass the corresponding private key into Guardian to be used for signatures.

### 1.4 VC Document

<figure><img src="../../../.gitbook/assets/image (7) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

Final step of the registration presents a form, based on the corresponding system schema, for the user to fill out.

## 2. New User registration

### 2.1. Select the Standard Registry to be associated with

<figure><img src="../../../.gitbook/assets/image (8) (1) (1) (1) (1) (1) (1) (1) (1) (2) (1).png" alt=""><figcaption></figcaption></figure>

### 2.2 User Hedera Account

<figure><img src="../../../.gitbook/assets/image (11) (1) (1) (1) (1) (1) (1) (1) (1) (2).png" alt=""><figcaption></figcaption></figure>

Specify the existing Hedera account with non-0 hbar balance to be used for submitting transactions associated with this user’s DID.

### 2.3 DID Document

#### 2.3.1 Default DID

<figure><img src="../../../.gitbook/assets/image (12) (1) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

For more details please refer to Section [1.2.1](bring-your-own-byo-dids-ui.md#id-1.2.1-default-did).

#### 2.3.2 Custom DID

<figure><img src="../../../.gitbook/assets/image (13) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

For more details, please refer to Section [1.2.2](bring-your-own-byo-dids-ui.md#id-1.2.2-externally-controlled-custom-did)

### 2.4 Keys

<figure><img src="../../../.gitbook/assets/image (14) (1) (1) (1) (1) (1) (1) (1) (1).png" alt=""><figcaption></figcaption></figure>

For more details, please refer to section [1.3](bring-your-own-byo-dids-ui.md#id-1.3-keys)

## 2. Demo Video

[Youtube](https://youtu.be/VVwHSu4LJ_w?si=warN7AxOVopv85G4\&t=117)
