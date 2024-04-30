# Guardian

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/guardian-service?label=version) [![Discord chat](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545)

## Overview

Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a digital (or digitized) Measurement, Reporting, and Verification requirements-based tokenization implementation.

[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](CONTRIBUTING.md#bug-reports) · [Request a Policy or a Feature](CONTRIBUTING.md#new-policy-or-feature-requests)

## Discovering Digital Environmental Assets assets on Hedera


As identified in Hedera Improvement Proposal 19 (HIP-19), each entity on the Hedera network may contain a specific identifier in the memo field for discoverability. Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service (HCS) Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. 

In the memo field of each token mint transaction you will find a unique Hedera message timestamp. This message contains the url of the Verifiable Presentation (VP) associated with the token. The VP can serve as a starting point from which you can traverse the entire sequence of documents produced by Guardian policy workflow, which led to the creation of the token. This includes a digital Methodology (Policy) HCS Topic, an associated Registry HCS Topic for that Policy, and a Project HCS Topic.

Please see p.17 in the FAQ for more information. This is further defined in [Hedera Improvement Proposal 28 (HIP-28)](https://hips.hedera.com/hip/hip-28).

([back to top](#readme))

## Getting started

To get a local copy up and running quickly, follow the steps below. Please refer to <https://docs.hedera.com/guardian> for complete documentation.

**Note**. If you have already installed another version of Guardian, remember to **perform a backup operation before upgrading**.

## Prerequisites

* [Hedera Testnet Account](https://portal.hedera.com)
* [Web3.Storage Account](https://web3.storage/)
* [Filebase Account](https://filebase.com/)

Note: as of January, 10th 2024 old web3.storage upload API (the main upload API before November 20, 2023) has been sunset. New **w3up** service accounts/API must be used with Guardian going forward.

When building the reference implementation, you can [manually build every component](#manual-installation) or run a single command with Docker.

## Automatic installation

### Prerequisites for automatic installation

* [Docker](https://www.docker.com)

If you build with docker [MongoDB V6](https://www.mongodb.com), [NodeJS V20](https://nodejs.org), [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) and [Nats 1.12.2](https://nats.io/) will be installed and configured automatically.

### Installation

The following steps need to be executed in order to start Guardian using docker:

1. Clone the repo
2. Configure project level .env file
3. Update BC access variables
4. Setup IPFS
5. Build and launch with Docker
6. Browse to [http://localhost:3000](http://localhost:3000)

Here the steps description follows:

#### 1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

#### 2. Configure project level .env file.

The main configuration file that needs to be provided to the Guardian system is the `.env` file.
Cut and paste the `.env.template` renaming it as `.env` here you may choose the name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data ( for more details read [here](https://docs.hedera.com/guardian/guardian/readme/environments/ecosystem-environments)).

For this example purpose let's name the Guardian platform as "develop"

```shell
   GUARDIAN_ENV="develop"
```

> **_NOTE:_**  Every single service is provided in its folder with a `.env.template` file, this set of files are only needed for the case of Manual installation. 

#### 3. Update BC access variables.

Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operator_ID and Operator_Key by looking at the link: [How to Create Operator_ID and Operator_Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-operator-id-and-operator-key).
The Operator_ID and Operator_Key and HEDERA_NET are all that Guardian needs to access the Hedera Blockchain assuming a role on it. This parameters needs to be configured in a file at the path `./configs`, the file should use the following naming convention:

   `./configs/.env.\<GUARDIAN_ENV\>.guardian.system`

There will be other steps in the Demo Usage Guide that will be required for the generation of Operator\_ID and Operator\_Key. It is important to mention that the Operator_ID and Operator_Key in the `./configs/.env.<GUARDIAN_ENV>.guardian.system` will be used to generate demo accounts.

The parameter `HEDERA_NET` may assume the following values: `mainnet`, `testnet`, `previewnet`, `localnode`. choose the right value depending on your target Hedera network on which the `OPERATOR_ID` has been defined.

   As examples:
 
   following the previous example, the file to configure should be named: `./configs/.env.develop.guardian.system`, this file is already provided in the folder as an example, only update the variables OPERATOR_ID, OPERATOR_KEY and HEDERA_NET.

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

##### 3.1. PREUSED_HEDERA_NET configuration

The `PREUSED_HEDERA_NET` parameter is intended to hold the target Hedera network that the system already started to notarize data to. PREUSED\_HEDERA\_NET is the reference to the HEDERA_NET that was in use before the upgrade.
To let the Multi-environment transition happen in a transparent way the `GUARDIAN_ENV` parameter in the `.env` file has to be configured as empty while  the `PREUSED_HEDERA_NET` has to be set with the same value configured in the `HEDERA_NET` parameter in the previous configuration file.  

`PREUSED_HEDERA_NET` never needs to be changed after the first initialization. On the contrary it will be possible to change `HEDERA_NET` to dials with all the Hedera different networks.

   - as first Example: 

   in case of the upgrading from a release minor then 2.13.0 to a bigger one and keep using the same HEDERA_NET="Mainnet"(as example)

   configure the name the Guardian platform as empty in the `.env` file 

   ```shell
      GUARDIAN_ENV=""
   ```

   In this case the configuration is stored in the file named: `./configs/.env..guardian.system`, and is already provided in the folder as an example, updating the variables OPERATOR_ID and OPERATOR_KEY.

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

> **_NOTE:_**  You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.

> **_NOTE:_**  for any other GUARDIAN\_ENV name of your choice just copy and paste the file `./configs/.env.template.guardian.system` and rename as `./configs/.env.<choosen name>.guardian.system`

#### 4. Now, we have two options to setup IPFS node :  1. Local node 2. IPFS Web3Storage node 3. Filebase Bucket.

##### 4.1 Setting up IPFS Local node:

   - 4.1.1 We need to install and configure any IPFS node. [example](https://github.com/yeasy/docker-ipfs)

   - 4.1.2 For setup IPFS local node you need to set variables in the same file `./configs/.env.develop.guardian.system`


   ```
   IPFS_NODE_ADDRESS="..." # Default IPFS_NODE_ADDRESS="http://localhost:5001"
   IPFS_PUBLIC_GATEWAY='...' # Default IPFS_PUBLIC_GATEWAY='https://localhost:8080/ipfs/${cid}'
   IPFS_PROVIDER="local"
   ```

##### 4.2 Setting up IPFS Web3Storage node:

To select this option ensure that `IPFS_PROVIDER="web3storage"` setting exists in your `./configs/.env.<environment>.guardian.system` file.

To configure access to the [w3up](https://github.com/web3-storage/w3up) IPFS upload API from web3.storage for your Guardian instance you need to set correct values to the following variables in the `./configs/.env.<environment>.guardian.system` file:
   
   ```
   IPFS_STORAGE_KEY="..."
   IPFS_STORAGE_PROOF="..."
   ```

> **_NOTE:_**  When Windows OS is used for creating the IPFS values, please use bash shell to prevent issues with base64 encoding.
 
To obtain the values for these variables please follow the steps below:
- Create an account on https://web3.storage, please specify the email you have access to as the account authentication is based on the email validation. Make sure to follow through the registration process to the end, choose an appropriate billing plan for your needs (e.g. 'starter') and enter your payment details.
- Install w3cli as described in the [corresponding section](https://web3.storage/docs/w3cli/#install) of the web3.storage documentation.
- Create your 'space' as described in the ['Create your first space'](https://web3.storage/docs/w3cli/#create-your-first-space) section of the documentation.
- Execute the following to set the Space you intend on delegating access to: 
  `w3 space use`.
- Execute the following command to retrieve your Agent private key and DID: 
`npx ucan-key ed`. 
The private key (starting with `Mg...`) is the value to be used in the environment variable `IPFS_STORAGE_KEY`.
- Retrieve the PROOF by executing the following:
  ```w3 delegation create <did_from_ucan-key_command_above> | base64```. 
  The output of this command is the value to be used in the environment variable `IPFS_STORAGE_PROOF`.

To summarise, the process of configuring delegated access to the w3up API consists of execution the following command sequence:
1. `w3 login`
2. `w3 space create`
3. `w3 space use`
4. `npx ucan-key ed`
5. `w3 delegation`

The complete guide to using the new w3up web3.storage API is available at https://web3.storage/docs/w3up-client.

#### 4.3 Setting up IPFS Filebase Bucket:

To configure the Filebase IPFS provider, set the following variables in the file *`./configs/.env.<environment>.guardian.system`*

   ```
   IPFS_STORAGE_API_KEY="Generated Firebase Bucket Token"
   IPFS_PROVIDER="filebase"
   ```

Create a new "bucket" on Filebase since we utilize the **IPFS Pinning Service API Endpoint** service. The **token**
generated for a bucket corresponds to the **IPFS_STORAGE_API_KEY** environment variable within the guardian's
configuration.

For detailed setup instructions, refer to the
official <https://docs.filebase.com/api-documentation/ipfs-pinning-service-api>.
  
#### 5. Setting up Chat GPT API KEY to enable AI Search and Guided Search:

For setting up AI and Guided Search, we need to set OPENAI_API_KEY variable in `./configs/.env*` files.

```shell
OPENAI_API_KEY="..."
```

#### 6. Build and launch with Docker. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

   ```shell
   docker compose up -d --build
   ```
   
> **_NOTE:_** About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/

#### 7. Browse to <http://localhost:3000> and complete the setup.

for other examples go to:
* [Deploying Guardian using a specific environment( DEVELOP)](https://docs.hedera.com/guardian/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-a-specific-environment-develop.md)
* [Steps to deploy Guardian using a specific Environment ( QA)](https://docs.hedera.com/guardian/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-a-specific-environment-qa.md)
* [Steps to deploy Guardian using default Environment](https://docs.hedera.com/guardian/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-default-environment.md)


## Manual installation

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for manual installation

* [MongoDB V6](https://www.mongodb.com)
* [NodeJS V20](https://nodejs.org)
* [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
* [Nats 1.12.2](https://nats.io/)
* [Redict 7.3.0](https://redict.io/)

### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

#### Services Configuration: 

-  for each of the services create the file `./<service_name>/.env` to do this copy, paste and rename  the file `./<service_name>/.env.template` 

   For example:

   in `./guardian-service/.env`:
   ```plaintext
       GUARDIAN_ENV="develop"
   ```

   If need to configure OVERRIDE uncomment the variable in file `./guardian-service/.env`:
   ```plaintext
       OVERRIDE="false" 
   ```

-  configure the file `./<service_name>/configs/.env.<service>.<GUARDIAN_ENV>` file: to do this copy, 
   paste and rename the file  `./<service_name>/.env.<service>.template` 

   following previous example:

   in `./guardian-service/configs/.env.guardian.develop`:
   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```
- Setting up Chat GPT API KEY to enable AI Search and Guided Search:
For setting up AI and Guided Search, we need to set OPENAI_API_KEY variable in `./ai-service/configs/.env*` files.

  ```plaintext
   OPENAI_KEY="..."
  ```
> **_NOTE:_** Once you start each service, please wait for the initialization process to be completed.**

#### 1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```
#### 2. Install dependencies

   Yarn:
   ```
   yarn
   ```

   Npm:
   ```
   npm install
   ```   
#### 3. From the **interfaces** folder

   Yarn:
   ```
    yarn workspace @guardian/interfaces run build
   ```

   Npm:
   ```
   npm --workspace=@guardian/interfaces run build
   ```

#### 4. From the **common** folder

   Yarn:
   ```
    yarn workspace @guardian/common run build
   ```

   Npm:
   ```
   npm --workspace=@guardian/common run build
   ```
#### 5. From the **logger-service** folder

   To build the service:

   Yarn:
   ```shell
   yarn workspace logger-service run build
   ```

   Npm:
   ```
   npm --workspace=logger-service run build
   ```

   Configure the service as previously described. Do not need special configuration variables.

   To start the service:

   Yarn:
   ```shell
   yarn workspace logger-service start
   ```

   Npm:
   ```
   npm --workspace=logger-service start
   ```
#### 6. From the **auth-service** folder

   To build the service:

   Yarn:
   ```shell
   yarn workspace auth-service run build
   ```

   Npm:
   ```
   npm --workspace=auth-service run build
   ```

   Configure the service as previously described. Do not need special configuration variables.

   To start the service:

   Yarn:
   ```shell
   yarn workspace auth-service start
   ```

   Npm:
   ```
   npm --workspace=auth-service start
   ```
   
#### 7. From the **policy-service** folder

   To build the service:

   Yarn:
   ```shell
   yarn workspace policy-service run build
   ```

   Npm:
   ```
   npm --workspace=policy-service run build
   ```
   Configure the service as previously described. Do not need special configuration variables.

   To start the service:

   Yarn:
   ```shell
   yarn workspace policy-service start
   ```

   Npm:
   ```
   npm --workspace=policy-service start
   ```   
#### 8. Build and start **worker-service** service

   Yarn:
   To build the service:
   ```
   yarn workspace worker-service run build
   ```

   Npm:
   ```
   npm --workspace=worker-service run build
   ```
   Configure the service as previously described. Update **IPFS_STORAGE_API_KEY** value in `./worker-service/configs/.env.worker` file.

   Yarn:
   To start the service:
   ```
   yarn workspace worker-service start
   ```

   Npm:
   ```
   npm --workspace=worker-service start
   ```
#### 9. Build and start **notification-service** service

   To build the service:

   Yarn:
   ```shell
   yarn workspace notification-service run build
   ```

   Npm:
   ```
   npm --workspace=notification-service run build
   ```
   Configure the service as previously described. Update **OPERATOR_ID** and **OPERATOR_KEY** values in `./guardian-service/configs/.env.worker` file as in the example above.

   To start the service (found on <http://localhost:3002>):

   Yarn:
   ```shell
   yarn workspace notification-service start
   ```

   Npm:
   ```
   npm --workspace=notification-service start
   ```
#### 10. Build and start **guardian-service** service

To build the service:

Yarn:
```shell
yarn workspace guardian-service run build
```

Npm:
```
npm --workspace=guardian-service run build
```
Configure the service as previously described. Update **OPERATOR_ID** and **OPERATOR_KEY** values
in `./guardian-service/configs/.env.worker` file as in the example above.

To start the service (found on <http://localhost:3002>):

Yarn:
```shell
yarn workspace guardian-service start
```

Npm:
```
npm --workspace=guardian-service start
```

#### 11. From the **api-gateway** folder

   To build the service:

Yarn:
   ```shell
   yarn workspace api-gateway run build
   ```

Npm:
```
npm --workspace=api-gateway run build
```

Configure the service as previously described. Do not need special configuration variables.

To start the service (found on <http://localhost:3002>):

Yarn:
   ```shell
   yarn workspace api-gateway start
   ```

Npm:
```
npm --workspace=api-gateway start
```

#### 12. From the **mrv-sender** folder

    To build the service:

    ```shell
    npm install
    npm run build
    ```

    Configure the service as previously described. Do not need special configuration variables.

    To start the service (found on <http://localhost:3005>):

    ```shell
    npm start
    ```

#### 13. From the **ai-service** folder

To build the service:

Yarn:
```shell
yarn workspace ai-service run build
```

Npm:
```
npm --workspace=ai-service run build
```

Configure the service as previously described. Do not need special configuration variables.

Yarn:
```
yarn workspace ai-service start
```

Npm:
```
npm --workspace=ai-service start
```

#### 14. From the **frontend** folder

    To build the service:

    ```shell
    npm install
    npm run build
    ```

    To start the service (found on <http://localhost:4200>):

    ```shell
    npm start
    ```

## Configuring a Hedera local network

#### 1. Install a Hedera Local Network following the [official documentation](https://github.com/hashgraph/hedera-local-node#docker)

#### 2. Configure Guardian's configuration files `/.env/.env.docker` accordingly:

   ```shell
   OPERATOR_ID=""
   OPERATOR_KEY=""
   LOCALNODE_ADDRESS="11.11.11.11"
   LOCALNODE_PROTOCOL="http"
   HEDERA_NET="localnode"
   ```

  **Note:**
   * Set `LOCALNODE_ADDRESS` to the IP address of your local node instance. The value above is given as an example.
   * Set `HEDERA_NET` to `localnode`. If not specified, the default value is `testnet`.
   * Configure `OPERATOR_ID` and `OPERATOR_KEY` accordingly with your local node configuration.
   * Remove `INITIALIZATION_TOPIC_ID` as the topic will be created automatically.
   * Set `LOCALNODE_PROTOCOL` to `http` or `https` accordingly with your local node configuration (it uses HTTP by default).

## Configuring Hashicorp Vault
#### 1. Configure .env/.env.docker files in the auth-service folder

   ```
    VAULT_PROVIDER = "hashicorp"
   ```
 
    Note: VAULT_PROVIDER can be set to "database" or "hashicorp" to select Database instance or a hashicorp vault instance correspondingly.
    
   If the VAULT_PROVIDER value is set to "hashicorp" the following 3 parameters should be configured in the auth-service folder.   
   
   1. HASHICORP_ADDRESS : http://localhost:8200 for using local vault. For remote vault, we need to use the value from the configuration settings of    Hashicorp vault service.
   2. HASHICORP_TOKEN : the token from the Hashicorp vault.
   3. HASHICORP_WORKSPACE : this is only needed when we are using cloud vault for Hashicorp. Default value is "admin".

#### 2. Hashicorp should be configured with the created Key-Value storage, named "secret" by default, with the settingKey=<value> records for the following keys:
    1. OPERATOR_ID
    2. OPERATOR_KEY
    3. IPFS_STORAGE_API_KEY
    
    Note: These records in the vault will be created automatically if there are environment variables with the matching names.
    
 **How to import existing user keys from DB into the vault:**
 
 During Guardian services initialization, we need to set the following configuration settings in **auth-service** folder:
 
  ```
    IMPORT_KEYS_FROM_DB = 1
    VAULT_PROVIDER = "hashicorp"
   ```
 
## Local development using Docker

#### 1. create .env file at the root level and update all variable requires for docker

   ```shell
   cp .env.example .env
   ```

#### 2. Start local development using docker compose

   ```shell
   docker compose -f docker-compose-dev.yml up --build
   ```

#### 3. Access local development using <http://localhost:3000> or <http://localhost:4200>

## Troubleshoot

**To delete all the containers**:

   ```shell
   docker builder prune --all
   ```

**To run by cleaning Docker cache**:

   ```shell
   docker compose build --no-cache
   ```

([back to top](readme))

## Unit tests

To run **guardian-service** unit tests, following commands needs to be executed:

```shell
cd guardian-service 
npm run test
```

It is also an ability to run Hedera network tests only. To do that, the following command needs to be executed:

```shell
npm run test:network
```

To run stability tests (certain transactions will be executed 10 times each), the following command needs to be executed:

```shell
npm run test:stability
```

([back to top](readme))

Please refer to <https://docs.hedera.com/guardian> for complete documentation about the following topics:

* Swagger API
* Postman Collection
* Demo Usage guide
* Contribute a New Policy
* Reference Implementation
* Technologies Built on
* Roadmap
* Change Log
* Contributing
* License
* Security

## Contact

For any questions, please reach out to the Envision Blockchain Solutions team at:

* Website: <www.envisionblockchain.com>
* Email: [info@envisionblockchain.com](mailto:info@envisionblockchain.com)

([back to top](#readme))

[license-url]: https://github.com/hashgraph/guardian/blob/main/LICENSE
