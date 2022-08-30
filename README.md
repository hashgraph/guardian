# Guardian

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/guardian-service?label=version) [![Discord chat](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545)

## Overview

Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a requirements-based tokenization implementation.

[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](CONTRIBUTING#bug-reports) · [Request a Policy or a Feature](CONTRIBUTING#new-policy-or-feature-requests)

## Discovering ESG assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each entity on the Hedera network may contain a specific identifier in the memo field for discoverability. Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. In the memo field of newly minted tokens, you will find a [Verifiable Link](https://github.com/InterWorkAlliance/Sustainability/blob/main/vem/supply/verification.md) which will allow users to discover the published standard the token is following and the entire history of the ESG asset and corresponding data to be publicly discoverable. This is further defined in [Hedera Improvement Proposal 28 (HIP-28)](https://hips.hedera.com/hip/hip-28).

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

If you build with docker [MongoDB](https://www.mongodb.com), [NodeJS](https://nodejs.org) and [Nats](https://nats.io/) will be installed and configured automatically.

### Installation

1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation ID and Operator Key by looking at link : [How to Create Operator ID and Operator Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-operator-id-and-operator-key). There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

   For example:

   in `guardian-service/.env`:

   ```plaintext
   OPERATOR_ID=""
   OPERATOR_KEY=""
   ```

   in `guardian-service/.env.docker`:

   ```plaintext
   OPERATOR_ID=""
   OPERATOR_KEY=""
   ```

   **Note**. You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.

3. Update the following files with your Web3.Storage API KEY. Please follow the steps from <https://web3.storage/docs/#quickstart> to obtain it.To know complete information on generating API Key please check [How to Create Web3.Storage API Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-web3.storage-api-key).

   For example:

   in `ipfs-client/.env`:

   ```plaintext
   IPFS_STORAGE_API_KEY=""
   ```

   or in `ipfs-client/.env.docker`:

   ```plaintext
   IPFS_STORAGE_API_KEY=""
   ```

4. Build and launch with Docker. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

   ```shell
   docker-compose up -d --build
   ```

5. Browse to <http://localhost:3000> and complete the setup.

## Manual installation

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for manual installation

* [MongoDB](https://www.mongodb.com)
* [NodeJS](https://nodejs.org)
* [Nats](https://nats.io/)

### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

**Note: Once you start each service, please wait for the initialization process to be completed.**

1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

2. From the **interfaces** folder

   Build package:

   ```shell
   npm install
   npm run build
   ```

3. From the **common** folder

   Build package:

   ```shell
   npm install
   npm run build
   ```

4. From the **logger-service** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service:

   ```shell
   npm start
   ```

5. From the **auth-service** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service:

   ```shell
   npm start
   ```

6. From the **ipfs-client** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service:

   ```shell
   npm start
   ```

7. From the **guardian-service** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service (found on <http://localhost:3004>):

   ```shell
   npm start
   ```

8. From the **api-gateway** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service (found on <http://localhost:3002>):

   ```shell
   npm start
   ```

9. From the **mrv-sender** folder

   To build the service:

   ```shell
   npm install
   npm run build
   ```

   To start the service (found on <http://localhost:3005>):

   ```shell
   npm start
   ```

10. From the **frontend** folder

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

2. Configure Guardian's configuration files `.env/.env.docker` accordingly:

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

## Local development using Docker

1. create .env file at the root level and update all variable requires for docker

   ```shell
   cp .env.example .env
   ```

2. Start local development using docker compose

   ```shell
   docker-compose -f docker-compose-dev.yml up --build
   ```

3. Access local development using <http://localhost:3000> or <http://localhost:4200>

## Troubleshoot

**To delete all the containers**:

   ```shell
   docker builder prune --all
   ```

**To run by cleaning Docker cache**:

   ```shell
   docker-compose build --no-cache
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
