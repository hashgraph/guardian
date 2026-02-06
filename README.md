# Guardian

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/guardian-service?label=version) [![Discord chat](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/9216/badge)](https://www.bestpractices.dev/projects/9216)

## Overview

Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a digital (or digitized) Measurement, Reporting, and Verification requirements-based tokenization implementation.

[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](CONTRIBUTING.md#bug-reports) · [Request a Policy or a Feature](CONTRIBUTING.md#new-policy-or-feature-requests)

## Discovering Digital Environmental Assets assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each entity on the Hedera network may contain a specific identifier in the memo field for discoverability. Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service (HCS) Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens.

In the memo field of each token mint transaction you will find a unique Hedera message timestamp. This message contains the url of the Verifiable Presentation (VP) associated with the token. The VP can serve as a starting point from which you can traverse the entire sequence of documents produced by Guardian policy workflow, which led to the creation of the token. This includes a digital Methodology (Policy) HCS Topic, an associated Registry HCS Topic for that Policy, and a Project HCS Topic.

Please see p.17 in the FAQ for more information. This is further defined in [Hedera Improvement Proposal 28 (HIP-28)](https://hips.hedera.com/hip/hip-28).

## Quickstart

This procedure is useful for demos, quick testing, and hackathons. It will only start the minimum required services for using the main Guardian features. It will not start features like the AI or MRV sender services, Prometheus integration, Grafana integration, etc.

1. Ensure to have [Git](https://git-scm.com/downloads) and [Docker](https://www.docker.com/) installed on your machine.
2. Clone this repository

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   cd guardian
   ```

3. Login or register on the [Hedera Developer Portal](https://portal.hedera.com/login).
4. Generate an ED25519 key pair and account.
5. Copy your AccountID (i.e, `0.0.123456...`) and the associated DER Encoded Private Key (i.e., `302e020100300506032b657004220420....`).
6. Create a local `.env` file in the root directory of your project and update it with your AccountID and private key.

   ```dotenv
   OPERATOR_ID=0.0.123456...
   OPERATOR_KEY=302e020100300506032b657004220420....
   ```

7. Start the environment with:

   ```shell
   docker compose -f docker-compose-quickstart.yml up --pull=always -d
   ```

8. Navigate to <http://localhost:3000> in your web browser.
9. If you want to stop the environment, preserving all the local data, use:

   ```shell
   docker compose -f docker-compose-quickstart.yml stop
   ```

10. If you want to destroy the environment, loosing all the local data, use:

    ```shell
    docker compose -f docker-compose-quickstart.yml down
    ```

## Getting started

To get a local copy up and running quickly, follow the steps below. Please refer to <https://guardian.hedera.com> for complete documentation.

**Note**. If you have already installed another version of Guardian, remember to **perform a backup operation before upgrading**.

## Prerequisites

### Software

1. **[Git](https://git-scm.com/downloads)** – source-control tooling
2. **[Docker](https://www.docker.com/)** – one-command build & run (recommended)
3. **[MongoDB v6](https://www.mongodb.com/)**, **[Node.js v20.19](https://nodejs.org/en/download)**, and **[NATS 2.9.25](https://nats.io/)** – auto-provisioned when using Docker Compose
4. **[IPFS storage](https://docs.ipfs.tech/concepts/what-is-ipfs/)** (choose one):

   - **[Storacha account](https://storacha.network/)** – IPFS pinning service (formerly Web3.Storage)
   - **[Filebase account](https://filebase.com/)** – S3-compatible IPFS pinning
   - Local IPFS node (e.g., **[Kubo](https://github.com/ipfs/kubo)**) – auto-provisioned when using Docker Compose

5. **[Redict](https://redict.io/)** – in-memory cache & message broker, independent fork of Redis® (auto-provisioned by the Docker stack)

When building the reference implementation, you can [manually build every component](#manual-installation) or run a single command with Docker.

### Hedera network

| Component | Testnet (default) | Mainnet (production) |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Account** | Create via [Hedera Developer Portal](https://portal.hedera.com/register) | Create via Hedera-enabled wallet (e.g.HashPack) |
| **Key type** | ED25519 | ED25519 |
| **Network** | `testnet` | `mainnet` |

> **Fees**: Mainnet operations incur HBAR costs—fund your account before running Guardian.

#### Preparing a Mainnet Account & Keys

1. Install a Hedera-enabled wallet (e.g., [HashPack](https://www.hashpack.app/)).
2. Create a Mainnet account and note the Account ID (`0.0.x`).
3. Export the ED25519 key pair
   - *HashPack path*: Settings → Manage Accounts → Export Private Key (DER format).
4. Update your `.env`

   ```dotenv
   HEDERA_NET=mainnet
   OPERATOR_ID=0.0.123456...
   OPERATOR_KEY=302e020100300506032b657004220420....
   ```

#### Preparing a Testnet Account & Keys

1. Create a Testnet account via the [Hedera Developer Portal](https://portal.hedera.com/register).
2. Record your Account ID (0.0.x).
3. Download the ED25519 private key (ignore ECDSA)
   - Select the DER Encoded Private Key — do not choose HEX Encoded.
4. Update your `.env`

   ```dotenv
   HEDERA_NET=testnet
   OPERATOR_ID=0.0.123456...
   OPERATOR_KEY=302e020100300506032b657004220420....
   ```

## Automatic installation

### Prerequisites for automatic installation

- [Docker](https://www.docker.com)

If you build with docker [MongoDB V6](https://www.mongodb.com), [Node.js v20.19](https://nodejs.org), [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable) and [Nats 2.9.25](https://nats.io/) will be installed and configured automatically.

### Installation

The following steps need to be executed in order to start Guardian using docker:

1. Clone the repo
2. Configure project level .env file
3. Update Hedera access variables
4. Setup IPFS
5. Build and launch with Docker
6. Browse to <http://localhost:3000>
7. For increased security remove credentials from .env file

Here the steps description follows:

#### 1. Clone the repo

   ```shell
   git clone https://github.com/hashgraph/guardian.git
   ```

#### 2. Configure project level .env file

The main configuration file that needs to be provided to the Guardian system is the .env file. Note that these files contain sensitive configuration such as keys and access credentials which are only used at the initial start of Guardian. For increased security it is recommended to disable inbound network access until after the first run of Guardian, when the credentials configuration has been removed from .env file (see p8 below).

For this example purpose let's name the Guardian platform as "develop"

```shell
   GUARDIAN_ENV="develop"
```

> ***NOTE:***  Every single service is provided in its folder with a `.env.template` file, this set of files are only needed for the case of Manual installation.

#### 3. Update Hedera access variables

Update the following files with your Hedera Mainnet or Testnet account info (see prerequisites). Please check complete steps to generate Operator_ID and Operator_Key by looking at the link: [How to Create Operator_ID and Operator_Key](https://guardian.hedera.com/getting-started/getting-started/how-to-create-operator-id-and-operator-key).
The Operator_ID and Operator_Key and HEDERA_NET are all that Guardian needs to access the Hedera Blockchain assuming a role on it. This parameters needs to be configured in a file at the path `./configs`, the file should use the following naming convention:

   `./configs/.env.\<GUARDIAN_ENV\>.guardian.system`

There will be other steps in the Demo Usage Guide that will be required for the generation of Operator\_ID and Operator\_Key. It is important to mention that the Operator_ID and Operator_Key in the `./configs/.env.<GUARDIAN_ENV>.guardian.system` will be used to generate demo accounts.

The parameter `HEDERA_NET` may assume the following values: `mainnet`, `testnet`, `previewnet`, `localnode`. choose the right value depending on your target Hedera network on which the `OPERATOR_ID` has been defined.

   As examples:

   following the previous example, the file to configure should be named: `./configs/.env.develop.guardian.system`, this file is already provided in the folder as an example, only update the variables OPERATOR_ID, OPERATOR_KEY and HEDERA_NET.

   ```text
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

- As first Example:

   in case of the upgrading from a release minor then 2.13.0 to a bigger one and keep using the same HEDERA_NET="Mainnet"(as example)

   configure the name the Guardian platform as empty in the `.env` file

   ```shell
      GUARDIAN_ENV=""
   ```

   In this case the configuration is stored in the file named: `./configs/.env..guardian.system`, and is already provided in the folder as an example, updating the variables OPERATOR_ID and OPERATOR_KEY.

   ```text
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

   PREUSED_HEDERA_NET is the reference to your previous HEDERA_NET configuration then you should set its value to match your previous HEDERA_NET configuration.

   ```text
   HEDERA_NET="mainnet"
   PREUSED_HEDERA_NET="mainnet"
   ```

   because you are keeping on using HEDERA_NET as it was pointing to the "mainnet" in the previous installation too.

- As a second example: to test the new release change the HEDERA_NET to "testnet". This is the complete configuration:

   Set the name of the Guardian platform to whatever description name in the `.env` file

   ```shell
      GUARDIAN_ENV="testupgrading"
   ```

   In this case the configuration is stored in the file named: `./configs/.env.testupgrading.guardian.system` again update the variables OPERATOR_ID and OPERATOR_KEY using your testnet account.

   ```text
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

   set the HEDERA_NET="testnet" and set the PREUSED_HEDERA_NET to refer to the mainnet as you wish that Mainet data remains unchanged.

   ```text
   HEDERA_NET="testnet"
   PREUSED_HEDERA_NET="mainnet"
   ```

   This configuration allows you to leave untouched all the data referring to Mainnet in the Database while testing on Testnet. Refer to Guardian
   [documentation](https://guardian.hedera.com/guardian/readme/environments/multi-session-consistency-according-to-environment) for more details.

> ***NOTE 1:*** You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
>
> ***NOTE 2:***  for any other GUARDIAN\_ENV name of your choice just copy and paste the file `./configs/.env.template.guardian.system` and rename as `./configs/.env.<choosen name>.guardian.system`

##### 3.2. Setting up JWT keys in /.env file

To start of auth-service it is necessary to fill in `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`, which are RSA key pair. You can generate it in any convenient way, for example, using [this service](https://travistidwell.com/jsencrypt/demo/).

##### 3.3. Setting up JWT keys for each service in the .env file

To start all services, you need to create a 2048-bit RSA key pair for each service. You can generate a key pair in any convenient way—for example, using [the online tool](https://mkjwk.org/) with the following settings:

- key size: 2048
- key use: signature
- algorithm: RS256: RSA
- key ID: sha256
- show: yes

For each service, you must add its secret key `SERVICE_JWT_SECRET_KEY` and a list of all public keys from every service:

- `SERVICE_JWT_PUBLIC_KEY_WORKER_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_TOPIC_LISTENER_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_QUEUE_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_POLICY_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_NOTIFICATION_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_LOGGER_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_GUARDIAN_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_AUTH_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_API_GATEWAY_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_AI_SERVICE`
- `SERVICE_JWT_PUBLIC_KEY_ANALYTICS_SERVICE`

Alternatively, you can create a single key pair and, instead of adding the public keys for each individual service, you can add `SERVICE_JWT_SECRET_KEY_ALL` and `SERVICE_JWT_PUBLIC_KEY_ALL` to use the same keys for all services. However, it is recommended to generate a separate key pair for each service.

#### 4. Now, we have these options to setup IPFS storage

- Local IPFS node
- Storacha
- Filebase bucket

##### 4.1 Setting up Local IPFS node

- Install and configure an IPFS node (e.g., [Kubo](https://github.com/ipfs/kubo))
- Setup the IPFS local node configuring the variables in the file `./configs/.env.develop.guardian.system` file:

   ```text
   IPFS_NODE_ADDRESS="..." # Default IPFS_NODE_ADDRESS="http://localhost:5001"
   IPFS_PUBLIC_GATEWAY='...' # Default IPFS_PUBLIC_GATEWAY='https://localhost:8080/ipfs/${cid}'
   IPFS_PROVIDER="local"
   ```

##### 4.2 Setting up Storacha account

To select this option ensure that `IPFS_PROVIDER="web3storage"` setting exists in your `./configs/.env.<environment>.guardian.system` file.

To configure access to the [Storacha upload service](https://github.com/storacha/upload-service) (a w3up protocol implementation) for your Guardian instance you need to set correct values to the following variables in the `./configs/.env.<environment>.guardian.system` file:

   ```text
   IPFS_STORAGE_KEY="..."
   IPFS_STORAGE_PROOF="..."
   ```

> ***NOTE:***  When Windows OS is used for creating the IPFS values, please use bash shell to prevent issues with base64 encoding.

To obtain the values for these variables please follow the steps below:

- Create an account on <https://storacha.network>, please specify the email you have access to as the account authentication is based on the email validation. Make sure to follow through the registration process to the end, choose an appropriate billing plan for your needs (e.g. 'STARTER') and enter your payment details.
- Install CLI as described in the [corresponding section](https://docs.storacha.network/cli/) of the Storacha documentation.
- Create your 'space' as described in the ['Create a Space'](https://docs.storacha.network/how-to/create-space/) section of the documentation.
- Execute the following to set the Space you intend on delegating access to: `storacha space use <space_did>`.
- The following command returns what will be your Agent private key and DID: `storacha key create`. The private key (starting with `Mg...`) is the value to be used in the environment variable `IPFS_STORAGE_KEY`.
- Retrieve the PROOF by executing the following: ```storacha delegation create <did_from_ucan-key_command_above> --base64```. The output of this command is the value to be used in the environment variable `IPFS_STORAGE_PROOF`.

To summarise, the process of configuring a UCAN delegated access to the Space you intend on delegating access to consists of execution the following command sequence:

1. `storacha login`
2. `storacha space create`
3. `storacha space use`
4. `storacha key create`
5. `storacha delegation`

The complete guide to using the new Storacha client is available at <https://docs.storacha.network/how-to/upload/>.

##### 4.3 Setting up IPFS Filebase Bucket

To configure the Filebase IPFS provider, set the following variables in the file *`./configs/.env.<environment>.guardian.system`*

   ```text
   IPFS_STORAGE_API_KEY="Generated Firebase Bucket Token"
   IPFS_PROVIDER="filebase"
   ```

Create a new "bucket" on Filebase since we utilize the **IPFS Pinning Service API Endpoint** service. The **token**
generated for a bucket corresponds to the **IPFS_STORAGE_API_KEY** environment variable within the guardian's
configuration.

For detailed setup instructions, refer to the
official <https://docs.filebase.com/api-documentation/ipfs-pinning-service-api>.

#### 5. Setting up Chat GPT API KEY to enable AI Search and Guided Search

For setting up AI and Guided Search, we need to set OPENAI_API_KEY variable in `./configs/.env*` files.

```shell
OPENAI_API_KEY="..."
```

#### 6. Build and launch with Docker

The following list outlines various Docker Compose configurations for different purposes. Choose the one that best suits your needs.

| Configuration | Description | Command to Run |
| --------------- | ------------- | ---------------- |
| Guardian (Quickstart) | Guardian using minimal number of services with pre-built images | `docker compose -f docker-compose-quickstart.yml up -d --pull always` |
| Guardian (Demo Mode) | Guardian demo using pre-built images | `docker compose up -d --build --pull always` |
| Guardian Build (Demo Mode) | Guardian demo building services from source code | `docker compose -f docker-compose-build.yml up -d --build` |
| Production Guardian | Guardian using pre-built images, no demo mode | `docker compose -f docker-compose-production.yml up -d --build --pull always` |
| Production Guardian Build | Guardian building services from source code, no demo mode | `docker compose -f docker-compose-production-build.yml up -d --build` |
| Indexer | Indexer using pre-built images | `docker compose -f docker-compose-indexer.yml up -d --build --pull always` |
| Indexer Build | Indexer building services from source code | `docker compose -f docker-compose-indexer-build.yml up -d --build` |
| Analytics Service | Analytics Service using pre-built images | `docker compose -f docker-compose-analytics.yml up -d --build --pull always` |
| Analytics Service Build | Analytics Service building services from source code | `docker compose -f docker-compose-analytics-build.yml up -d --build` |

To proceed:

1. Choose the configuration that matches your requirements.
2. Open a terminal in the project root folder.
3. Run the corresponding command from the "Command to Run" column.

For example, to run the standard Guardian in demo mode:

```shell
docker compose up -d --build --pull always
```

This will start the containers in detached mode (-d) and build them if necessary.

> ***NOTE 1:*** Configurations with "Build" in their name compile the application from source code, which may take longer but allows for customization.
>
> ***NOTE 2:*** Production configurations do not include demo features and will not contain any debug information.
>
> ***NOTE 3:*** From the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at <https://docs.docker.com/compose/install/>

#### 7. Browse to <http://localhost:3000> and complete the setup

For other examples go to:

- [Deploying Guardian using a specific environment( DEVELOP)](https://guardian.hedera.com/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-a-specific-environment-develop)
- [Steps to deploy Guardian using a specific Environment ( QA)](https://guardian.hedera.com/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-a-specific-environment-qa)
- [Steps to deploy Guardian using default Environment](https://guardian.hedera.com/guardian/readme/getting-started/installation/building-from-source-and-run-using-docker/deploying-guardian-using-default-environment)

#### 8. For increased security remove credentials from .env file and enable network access

On first state the credentials from .env file are copied into the secure storage as configured (e.g. Vault). After that Guardian does not use any credentials stored in the .env file, thus they should be removed for security reasons.

## Manual installation

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for manual installation

- [MongoDB V6](https://www.mongodb.com)
- [Node.js v20.19](https://nodejs.org)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
- [Nats 2.9.25](https://nats.io/)
- [Redict](https://redict.io/)
- [Seq 2025.2 - optional for logging](https://datalust.co/seq)

### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

#### Services Configuration

- For each of the services create the file `./<service_name>/.env` to do this copy, paste and rename  the file `./<service_name>/.env.template`. For example, in `./guardian-service/.env`:

   ```text
   GUARDIAN_ENV="develop"
   ```

   If need to configure OVERRIDE uncomment the variable in file `./guardian-service/.env`:

   ```text
   OVERRIDE="false"
   ```

- Configure the file `./<service_name>/configs/.env.<service>.<GUARDIAN_ENV>` file: to do this copy, paste and rename the file  `./<service_name>/.env.<service>.template`

   following previous example:

   in `./guardian-service/configs/.env.guardian.develop`:

   ```text
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```

- Set up Chat GPT API KEY to enable AI Search and Guided Search. For setting up AI and Guided Search, we need to set OPENAI_API_KEY variable in `./ai-service/configs/.env*` files.

   ```text
   OPENAI_API_KEY="..."
   ```

> ***NOTE:*** Once you start each service, please wait for the initialization process to be completed.**

#### 1. Clone the repo and install dependencies

Yarn:

```shell
git clone https://github.com/hashgraph/guardian.git
cd guardian
yarn
```

Npm:

```shell
git clone https://github.com/hashgraph/guardian.git
cd guardian
npm install
```

#### 2. From the **interfaces** folder

Yarn:

```shell
yarn workspace @guardian/interfaces run build
```

Npm:

```shell
npm --workspace=@guardian/interfaces run build
```

#### 3. From the **common** folder

Yarn:

```shell
yarn workspace @guardian/common run build
```

Npm:

```shell
npm --workspace=@guardian/common run build
```

#### 4. From the **logger-service** folder

Configure the service as previously described. Do not need special configuration variables.

Yarn:

```shell
yarn workspace logger-service run build
yarn workspace logger-service start
```

Npm:

```shell
npm --workspace=logger-service run build
npm --workspace=logger-service start
```

#### 5. From the **auth-service** folder

Configure the service as previously described. Do not need special configuration variables.

Yarn:

```shell
yarn workspace auth-service run build
yarn workspace auth-service start
```

Npm:

```shell
npm --workspace=auth-service run build
npm --workspace=auth-service start
```

#### 6. From the **policy-service** folder

Configure the service as previously described. Do not need special configuration variables.

Yarn:

```shell
yarn workspace policy-service run build
yarn workspace policy-service start
```

Npm:

```shell
npm --workspace=policy-service run build
npm --workspace=policy-service start
```

#### 7. Build and start the **worker-service** service

Configure the service as previously described. Update **IPFS_STORAGE_API_KEY** value in `./worker-service/configs/.env.worker` file.

Yarn:

```shell
yarn workspace worker-service run build
yarn workspace worker-service start
```

Npm:

```shell
npm --workspace=worker-service run build
npm --workspace=worker-service start
```

#### 8. Build and start the **notification-service** service

Configure the service as previously described. Update **OPERATOR_ID** and **OPERATOR_KEY** values in `./notification-service/configs/.env.worker` file as in the example above. The service will start on <http://localhost:3002> by default.

Yarn:

```shell
yarn workspace notification-service run build
yarn workspace notification-service start
```

Npm:

```shell
npm --workspace=notification-service run build
npm --workspace=notification-service start
```

#### 9. Build and start the **guardian-service** service

Configure the service as previously described. Update **OPERATOR_ID** and **OPERATOR_KEY** values in `./guardian-service/configs/.env.worker` file as in the example above. The service will start on <http://localhost:3002> by default.

Yarn:

```shell
yarn workspace guardian-service run build
yarn workspace guardian-service start
```

Npm:

```shell
npm --workspace=guardian-service run build
npm --workspace=guardian-service start
```

#### 10. From the **api-gateway** folder

Configure the service as previously described. Do not need special configuration variables. The service will start on <http://localhost:3002> by default.

Yarn:

```shell
yarn workspace api-gateway run build
yarn workspace api-gateway start
```

Npm:

```shell
npm --workspace=api-gateway run build
npm --workspace=api-gateway start
```

#### 11. From the **mrv-sender** folder

Configure the service as previously described. Do not need special configuration variables. The service will start on <http://localhost:3005> by default.

```shell
npm install
npm run build
npm start
```

#### 12. From the **ai-service** folder

Configure the service as previously described. Do not need special configuration variables.

Yarn:

```shell
yarn workspace ai-service run build
yarn workspace ai-service start
```

Npm:

```shell
npm --workspace=ai-service run build
npm --workspace=ai-service start
```

#### 13. From the **frontend** folder

The service will start on <http://localhost:4200> by default.

```shell
npm install
npm run build
npm start
```

### Configuring a Hedera local network

- Install a Hedera Local Network following the [official documentation](https://github.com/hashgraph/hedera-local-node#docker)
- Configure Guardian's configuration files `/.env/.env.docker` accordingly:

  ```shell
  OPERATOR_ID=""
  OPERATOR_KEY=""
  LOCALNODE_ADDRESS="11.11.11.11"
  LOCALNODE_PROTOCOL="http"
  HEDERA_NET="localnode"
  ```

Note:

- Set `LOCALNODE_ADDRESS` to the IP address of your local node instance. The value above is given as an example.
- Set `HEDERA_NET` to `localnode`. If not specified, the default value is `testnet`.
- Configure `OPERATOR_ID` and `OPERATOR_KEY` accordingly with your local node configuration.
- Remove `INITIALIZATION_TOPIC_ID` as the topic will be created automatically.
- Set `LOCALNODE_PROTOCOL` to `http` or `https` accordingly with your local node configuration (it uses HTTP by default).

### Configuring Hashicorp Vault

1. Configure .env/.env.docker files in the auth-service folder

   ```text
   VAULT_PROVIDER = "hashicorp"
   ```

   Note: `VAULT_PROVIDER` can be set to "database" or "hashicorp" to select Database instance or a hashicorp vault instance correspondingly.

   If the `VAULT_PROVIDER` value is set to "hashicorp" the following 3 parameters should be configured in the auth-service folder.

   - `HASHICORP_ADDRESS`: <http://localhost:8200> for using local vault. For remote vault, we need to use the value from the configuration settings of    Hashicorp vault service.
   - `HASHICORP_TOKEN`: the token from the Hashicorp vault.
   - `HASHICORP_WORKSPACE`: this is only needed when we are using cloud vault for Hashicorp. Default value is "admin".

2. Hashicorp should be configured with the created Key-Value storage, named `secret` by default, with the `settingKey=<value>` records for the following keys: `OPERATOR_ID`, `OPERATOR_KEY`, `IPFS_STORAGE_API_KEY`.

   Note: These records in the vault will be created automatically if there are environment variables with the matching names.

**How to import existing user keys from DB into the vault:**

During Guardian services initialization, we need to set the following configuration settings in **auth-service** folder:

```text
IMPORT_KEYS_FROM_DB = 1
VAULT_PROVIDER = "hashicorp"
```

### Local development using Docker

1. Create .env file at the root level and update all variable requires for docker

   ```shell
   cp .env.example .env
   ```

2. Start local development using docker compose

   ```shell
   docker compose -f docker-compose-build.yml up --build
   ```

3. Access local development using <http://localhost:3000> or <http://localhost:4200>

## Troubleshoot

### Delete all the containers

```shell
docker builder prune --all
```

### Build with clean cache

```shell
docker compose build --no-cache
```

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

## Additional documentation

Please refer to <https://guardian.hedera.com/> for complete documentation about the following topics:

- Swagger API
- Postman Collection
- Demo Usage guide
- Contribute a New Policy
- Reference Implementation
- Technologies Built on
- Roadmap
- Changelog
- Contributing
- License
- Security

## Contact information

For any questions, please reach out to the Envision Blockchain Solutions team at:

- Website: <www.envisionblockchain.com>
- Email: [info@envisionblockchain.com](mailto:info@envisionblockchain.com)

([back to top](#guardian))

## License

MIT License. See the [LICENSE](LICENSE) file for details.
