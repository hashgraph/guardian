# 🔨 How to generate Web3.Storage API values

For additional information, please visit: [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart)

1. [Step By Step Process](how-to-generate-web3.storage-api-key.md#step-by-step-process)
2. [Demo Video](how-to-generate-web3.storage-api-key.md#demo-video)

### Step By Step Process

Following are the steps to follow to generate Web3.Storage API values:

1. Create an account on [https://web3.storage](https://web3.storage/), please specify the email you have access to as the account authentication is based on the email validation. Make sure to follow through the registration process to the end, choose an appropriate billing plan for your needs (e.g. 'starter') and enter your payment details.

<figure><img src="../../../.gitbook/assets/image (417).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (418).png" alt=""><figcaption></figcaption></figure>

2\. Install w3cli as described in the [corresponding section](https://web3.storage/docs/w3cli/#install) of the web3.storage documentation.

**You'll need** [**Node**](https://nodejs.org/en) **version 18 or higher, with NPM version 7 or higher to complete the installation**

You can check your local versions like this:

```
node --version && npm --version
```

Install the `@web3-storage/w3cli` package with `npm`

```
npm install -g @web3-storage/w3cli
```

3\. Create your 'space' as described in the ['Create your first space'](https://web3.storage/docs/w3cli/#create-your-first-space) section of the documentation.

```
w3 space create
```

4. Execute the following to set the Space you intend on delegating access to:

```
w3 space use
```

5. Execute the following command to retrieve your Agent private key and DID:

```
npx ucan-key ed
```

{% hint style="info" %}
**Note:** The private key (starting with `Mg...`) is the value to be used in the environment variable `IPFS_STORAGE_KEY`.
{% endhint %}

6. Retrieve the IPFS\_STORAGE\_PROOF by executing the following:

```
w3 delegation create <did_from_ucan-key_command_above> | base64
```

The output of this command is the value to be used in the environment variable `IPFS_STORAGE_PROOF`.

**To summarize, the process of configuring delegated access to the w3up API consists of execution of the following command sequence:**

1. `w3 login`
2. `w3 space create`
3. `w3 space use`
4. `npx ucan-key ed`
5. `w3 delegation`

### Demo Video

[Youtube](https://www.youtube.com/watch?v=q5OK9VWBn8Y\&list=PLnld0e1pwLhqdR0F9dusqILDww6uZywwR\&index=12)
