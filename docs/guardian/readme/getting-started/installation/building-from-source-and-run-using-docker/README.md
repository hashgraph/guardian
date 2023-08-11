# 🔨 Building from source and run using Docker

The following steps need to be executed in order to start Guardian using docker:

1. Clone the repo
2. Configure project level .env file
3. Update BC access variables
4. Setup IPFS
5. Build and launch with Docker
6. Browse to [http://localhost:3000](http://localhost:3000)

Here the steps description follows:

1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

2. Configure project level .env file.

The main configuration file that needs to be provided to the Guardian system is the `.env` file.
Cut and paste the `.env.template` renaming it as `.env` here you may choose the name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data ( for more details read [here](https://docs.hedera.com/guardian/guardian/readme/environments/ecosystem-environments)).

For this example purpose let's name the Guardian platform as "develop"

```shell
   GUARDIAN_ENV="develop"
```

{% hint style="info" %}
**Note**  Every single service is provided in its folder with a `.env.template` file, this set of files are only needed for the case of Manual installation. 
{% endhint %}

3. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operator_ID and Operator_Key by looking at the link: [How to Create Operator_ID and Operator_Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-operator-id-and-operator-key).
The Operator_ID and Operator_Key and HEDERA_NET  are all that Guardian needs to access the Hedera Blockchain assuming a role on it. This parameters needs to be configured in a file at the path `./configs`, the file should use the following naming convention:

   `./configs/.env.\<GUARDIAN_ENV\>.guardian.system`

There will be other steps in the Demo Usage Guide that will be required for the generation of Operator\_ID and Operator\_Key. It is important to mention that the Operator_ID and Operator_Key in the `./configs/.env.<GUARDIAN_ENV>.guardian.system` will be used to generate demo accounts.

The parameter `HEDERA_NET` may assume the following values: `mainnet`, `testnet`, `previewnet`, `localnode`. choose the right value depending on your target Hedera network on which the `OPERATOR_ID` has been defined.

   As examples:
 
   following the previous example, the file to configure should be named: `./configs/.env.develop.guardian.system`, this file is already provided in the folder as example, only update the variables OPERATOR_ID, OPERATOR_KEY and HEDERA_NET.

   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   HEDERA_NET="..."
   ```

Starting from Multi-environment release (2.13.0) it has been introduced a new parameter `PREUSED_HEDERA_NET`.
Multienvironemnt is a breaking change and the configuration of this parameter intend to smooth the upgrading. 
`PREUSED_HEDERA_NET` configuration depends on the installation context.

- If the installation is a completely new one just remove the parameter and feel free to jump to the next paragraph.
- if you are upgrading from a release after the Multi-environment (>= to 2.13.0) do not change the state of this parameter (so if you removed the parameter in some previous installation do not introduce it).
- if the installation is an upgrading from a release previous of the Multi-environment (<= to 2.13.0) to a following one you need to configure the `PREUSED_HEDERA_NET`. After that the parameter will last in the configuration unchanged.

#### 3.1. PREUSED_HEDERA_NET configuration

The `PREUSED_HEDERA_NET` parameter is intended to hold the target Hedera network that the system already started to notarize data to. PREUSED\_HEDERA\_NET is the reference to the HEDERA_NET that was in usa before the upgrade.
To let the Multi-environment transition happen in a transparent way the `GUARDIAN_ENV` parameter in the `.env` file has to be configured as empty while  the `PREUSED_HEDERA_NET` has to be set with the same value configured in the `HEDERA_NET` parameter in the previous configuration file.  

`PREUSED_HEDERA_NET` never needs to be changed after the first initialization. On the contrary it will be possible to change `HEDERA_NET` to dials with all the Hedera different networks.

   - as first Example: 

   in case of the upgrading from a release minor then 2.13.0 to a bigger one and keep using the same HEDERA_NET="Mainnet"(as example)

   configure the name the Guardian platform as empty in the `.env` file 

   ```shell
      GUARDIAN_ENV=""
   ```

   In this case the configuration is stored in the file named: `./configs/.env..guardian.system`, and is already provided in the folder as example, update the variables OPERATOR_ID and OPERATOR_KEY.

   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```
   PREUSED_HEDERA_NET is the reference to your previous HEDERA_NET configuration then you should set its value to match your previous HEDERA_NET configuration.

   ```plaintext
   HEDERA_NET="mainnet"
   PREUSED_HEDERA_NET="mainnet"
   ```

   because you are keeping on using HEDERA_NET as it was pointing to the "mainnet" in the previous installation too.

   - As a second example: to test the new release change the HEDERA_NET to "testnet". This is the complete configuration:

   Set the name of the Guardian platform to whatever descripting name in the `.env` file 

   ```shell
      GUARDIAN_ENV="testupgrading"
   ```

   In this case the configuration is stored in the file named: `./configs/.env.testupgrading.guardian.system` again update the variables OPERATOR_ID and OPERATOR_KEY using your testnet account.

   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

   set the HEDERA_NET="testnet" and set the PREUSED_HEDERA_NET to refer to the mainnet as you wish that Mainet data remains unchanged.

   ```plaintext
   HEDERA_NET="testnet"
   PREUSED_HEDERA_NET="mainnet"
   ```

   This configuration allows you to leave untouched all the data referring to Mainnet in the Database while testing on Testnet. Refer to Guardian 
   [documentation](https://docs.hedera.com/guardian/guardian/readme/environments/multi-session-consistency-according-to-environment) for more details.

{% hint style="info" %}
**Note**. You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
{% endhint %}

{% hint style="info" %}
**Note** for any other GUARDIAN\_ENV name of your choice just copy and paste the file `/configs/.env.template.guardian.system` and rename as `/configs/.env.<choosen name>.guardian.system`
{% endhint %}

4\. Now, we have two options to setup IPFS node : 1. Local node 2. IPFS Web3Storage node.

#### 4.1 Setting up IPFS Local node:

  - 4.1.1 We need to install and configure any IPFS node. [example](https://github.com/yeasy/docker-ipfs)

   - 4.1.2 For setup IPFS local node you need to set variables in the same file `./configs/.env.develop.guardian.system`


```
IPFS_NODE_ADDRESS="..." # Default IPFS_NODE_ADDRESS="http://localhost:5002"
IPFS_PUBLIC_GATEWAY='...' # Default IPFS_PUBLIC_GATEWAY='https://localhost:8080/ipfs/${cid}'
IPFS_PROVIDER="local"
```

{% hint style="info" %}
Note:

1. Default IPFS\_NODE\_ADDRESS="[http://localhost:5002](http://localhost:5002/)"
2. Default IPFS\_PUBLIC\_GATEWAY="[https://localhost:8080/ipfs/${cid}](https://localhost:8080/ipfs/$%7Bcid%7D)"
{% endhint %}

#### 4.2 Setting up IPFS Web3Storage node:

For setup IPFS web3storage node you need to set variables in file `./configs/.env.develop.guardian.system`:

```
IPFS_STORAGE_API_KEY="..."
IPFS_PROVIDER="web3storage"
```

To generate Web3.Storage API KEY please follow the steps from [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart) to obtain it. To know complete information on generating API Key please check : [how-to-generate-web3.storage-api-key.md](../../../../../getting-started/getting-started/how-to-generate-web3.storage-api-key.md "mention")

5\. Build and launch with Docker. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

```
docker-compose up -d --build
```

{% hint style="info" %}
**Note:**

About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/
{% endhint %}

6\. Browse to [http://localhost:3000](http://localhost:3000) and complete the setup. To get more info, please check: [Launching Guardian](../broken-reference/)

### Troubleshoot

#### To delete all the Docker Containers

```
docker builder prune --all
```

#### To run by cleaning Docker Cache

```
docker-compose build --no-cache
```

In the subsection you’ll find the following examples:

* [Steps on how to deploy Guardian using a default Environment ](deploying-guardian-using-default-environment.md)
* [Steps on how to deploy Guardian using a default Environment ( Develop ) ](deploying-guardian-using-a-specific-environment-develop.md)
* [Steps on how to deploy Guardian using a default Environment ( QA ) ](deploying-guardian-using-a-specific-environment-qa.md)
