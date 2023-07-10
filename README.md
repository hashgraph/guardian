# Guardian

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/guardian-service?label=version) [![Discord chat](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545)

## Overview

Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a digital (or digitzed) Measurement, Reporting, and Verification requirements-based tokenization implementation.

[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](CONTRIBUTING#bug-reports) · [Request a Policy or a Feature](CONTRIBUTING#new-policy-or-feature-requests)

## Discovering Digital Environmental Assets assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each entity on the Hedera network may contain a specific identifier in the memo field for discoverability. Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service (HCS) Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. 

In the memo field of each token mint transaction you will find a unique Hedera message timestamp. This message contains the url of the Verifiable Presentation (VP) associated with the token. The VP can serve as a starting point from which you can traverse the entire sequence of documents produced by Guardian policy workflow, which led to the creation of the token. This includes a digital Methodology (Policy) HCS Topic, an asspciated Registry HCS Topic for that Policy, and a Project HCS Topic.

Please see p.17 in the FAQ for more information. This is further defined in [Hedera Improvement Proposal 28 (HIP-28)](https://hips.hedera.com/hip/hip-28).

([back to top](#readme))

## Getting started

To get a local copy up and running quickly, follow the steps below. Please refer to <https://docs.hedera.com/guardian> for complete documentation.

**Note**. If you have already installed another version of Guardian, remember to **perform backup operation before upgrading**.

## Prerequisites

* [Hedera Testnet Account](https://portal.hedera.com)
* [Web3.Storage Account](https://web3.storage/)

When building the reference implementation, you can [manually build every component](#manual-installation) or run a single command with Docker.

## Automatic installation

### Prerequisites for automatic installation

* [Docker](https://www.docker.com)

If you build with docker [MongoDB V6](https://www.mongodb.com), [NodeJS V16](https://nodejs.org), [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) and [Nats 1.12.2](https://nats.io/) will be installed and configured automatically.

### Installation

1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation_ID and Operator_Key by looking at link: [How to Create Operator_ID and Operator_Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-operator-id-and-operator-key). There will be other steps in the Demo Usage Guide that will be required for the generation of Operator_ID and Operator_Key. It is important to mention that the Operator_ID and Operator_Key in the ```/configs/.env.\<GUARDIAN_ENV\>.guardian.system``` will be used to generate demo accounts.

   For example:

   in **.env.template** you may choose name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data (for more details read at https://docs.hedera.com/guardian/guardian/readme/environments/ecosystem-environments)
   
   ```shell
      GUARDIAN_ENV="develop"
   ```
   
   in ```/configs/.env.develop.guardian.system```

   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

   **Note**. You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
   
4. Now, we have two options to setup IPFS node :  1. Local node 2. IPFS Web3Storage node.

   **3.1 Setting up IPFS Local node:**

   - 3.1.1 We need to install and configure any IPFS node. 

   For example: https://github.com/yeasy/docker-ipfs

   - 3.1.2 For setup IPFS local node you need to set variables in the same file ```/configs/.env.develop.guardian.system```

   ```
   IPFS_NODE_ADDRESS="..." # Default IPFS_NODE_ADDRESS="http://localhost:5002"
   IPFS_PUBLIC_GATEWAY='...' # Default IPFS_PUBLIC_GATEWAY='https://localhost:8080/ipfs/${cid}'
   IPFS_PROVIDER="local"
   ```
   
   **3.2 Setting up IPFS Web3Storage node:**
   
   3.2.1 For setup IPFS web3storage node you need to set variables in the same file ```/configs/.env.develop.guardian.system```
   
   ```
   IPFS_STORAGE_API_KEY="..."
   IPFS_PROVIDER="web3storage"
   ```
 
   To generate Web3.Storage API KEY. Please follow the steps from <https://web3.storage/docs/#quickstart> to obtain it. To know complete information on generating API Key please check [How to Create Web3.Storage API Key](https://docs.hedera.com/guardian/guardian/readme/getting-started/how-to-generate-web3.storage-api-key).
  
5. Build and launch with Docker. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

   ```shell
   docker compose up -d --build
   ```
   
**Note**. About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/

5. Browse to <http://localhost:3000> and complete the setup.

## Manual installation

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for manual installation

* [MongoDB V6](https://www.mongodb.com)
* [NodeJS V16](https://nodejs.org)
* [Nats 1.12.2](https://nats.io/)
* [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.
Configure **.env.template** file in each service

   For example:

   in `/guardian-service/.env`:
   ```plaintext
       GUARDIAN_ENV="develop"
   ```

   If need to configure OVERRIDE variables add it in **.env.template** file :
   ```plaintext
       OVERRIDE="false" 
   ```

   in `/guardian-service/configs/.env.guardian.develop`:
   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

**Note: Once you start each service, please wait for the initialization process to be completed.**

1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```
2. Install dependencies
   ```
   yarn
   ```

3. From the **interfaces** folder

   ```
    yarn workspace @guardian/interfaces run build
   ```

4. From the **common** folder

   ```
    yarn workspace @guardian/common run build
   ```

5. From the **logger-service** folder

   To build the service:

   ```shell
   yarn workspace logger-service run build
   ```

   To start the service:

   ```shell
   yarn workspace logger-service start
   ```

6. From the **auth-service** folder

   To build the service:

   ```shell
   yarn workspace auth-service run build
   ```

   To start the service:

   ```shell
   yarn workspace auth-service start
   ```
7. From the **policy-service** folder

   To build the service:

   ```shell
   yarn workspace policy-service run build
   ```
   To start the service:
   
   ```shell
   yarn workspace policy-service run build
   ```
8. Build and start **worker-service** service
   
   Update **IPFS_STORAGE_API_KEY** value in ```/worker-service/configs/.env.worker``` file.

   To build the service:
   ```
   yarn workspace worker-service run build
   ```
   To start the service:
   ```
   yarn workspace worker-service start
   ```

9. Build and start **guardian-service** service

   Update **OPERATOR_ID** and **OPERATOR_KEY** values in ```/guardian-service/configs/.env.worker``` file.

   To build the service:

   ```shell
   yarn workspace guardian-service run build
   ```

   To start the service (found on <http://localhost:3002>):

   ```shell
   yarn workspace guardian-service start
   ```

10. From the **api-gateway** folder

   To build the service:

   ```shell
   yarn workspace api-gateway run build
   ```

   To start the service (found on <http://localhost:3002>):

   ```shell
   yarn workspace api-gateway start
   ```

10. From the **mrv-sender** folder

    To build the service:

    ```shell
    npm install
    npm run build
    ```

    To start the service (found on <http://localhost:3005>):

    ```shell
    npm start
    ```

11. From the **frontend** folder

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

1. Install a Hedera Local Network following the [official documentation](https://github.com/hashgraph/hedera-local-node#docker)

2. Configure Guardian's configuration files `/.env/.env.docker` accordingly:

   ```shell
   OPERATOR_ID=""
   OPERATOR_KEY=""
   LOCALNODE_ADDRESS="11.11.11.11"
   LOCALNODE_PROTOCOL="http"
   HEDERA_NET="localnode"
   ```

   Note:

   * Set `LOCALNODE_ADDRESS` to the IP address of your local node instance. The value above is given as example.
   * Set `HEDERA_NET` to `localnode`. If not specified, the default value is `testnet`.
   * Configure `OPERATOR_ID` and `OPERATOR_KEY` accordingly with your local node configuration.
   * Remove `INITIALIZATION_TOPIC_ID` as the topic will be created automatically.
   * Set `LOCALNODE_PROTOCOL` to `http` or `https` accordingly with your local node configuration (it uses HTTP by default).

## Configuring Hashicorp Vault
1. Configure .env/.env.docker files in auth-service folder

    ```
    VAULT_PROVIDER = "hashicorp"
   ```
 
    Note: VAULT_PROVIDER can be set to "database" or "hashicorp" to select Database instance or a hashicorp vault instance correspondingly.
    
   If the VAULT_PROVIDER value is set to "hashicorp" the following 3 parameters should be configured in auth-service folder.   
   
   1. HASHICORP_ADDRESS : http://localhost:8200 for using local vault. For remote vault, we need to use the value from the configuration settings of    Hashicorp vault service.
   2. HASHICORP_TOKEN : the token from the Hashicorp vault.
   3. HASHICORP_WORKSPACE : this is only needed when we are using cloud vault for Hashicorp. Default value is "admin".

2. Hashicorp should be configured with the created Key-Value storage, named "secret" by default, with the settingKey=<value> records for the following keys:
    1. OPERATOR_ID
    2. OPERATOR_KEY
    3. IPFS_STORAGE_API_KEY
    
    Note: These records in vault will be created automatically if there are environment variables with the matching names.
    
 **How to import existing user keys from DB into the vault:**
 
 During Guardian services initialization, we need to set the following configuration settings in **auth-service** folder:
 
  ```
    IMPORT_KEYS_FROM_DB = 1
    VAULT_PROVIDER = "hashicorp"
   ```
 
## Local development using Docker

1. create .env file at the root level and update all variable requires for docker

   ```shell
   cp .env.example .env
   ```

2. Start local development using docker compose

   ```shell
   docker compose -f docker-compose-dev.yml up --build
   ```

3. Access local development using <http://localhost:3000> or <http://localhost:4200>

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

It is also an ability to run Hedera network test only. To do that, the following command needs to be executed:

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
