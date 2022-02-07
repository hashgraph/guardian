# README

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/ui-service?label=version)

## Guardian

The Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of the Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a requirements-based tokenization implementation.\


\
[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](https://github.com/hashgraph/guardian/issues) · [Request a Policy or a Feature](https://github.com/hashgraph/guardian/issues)

<details>

<summary>Table of Contents</summary>

1. [Discovering ESG assets on Hedera](broken-reference)
2. [Getting Started](broken-reference)
   * [Prerequisites](broken-reference)
   * [Installation](broken-reference)
3. [Demo Usage Guide](broken-reference)
4. [Contributing](broken-reference)
5.
   * [Contribute a New Policy](broken-reference)
   * [Request a New Policy or Feature](broken-reference)
6. [Reference Implementation](broken-reference)
7. [Built With](broken-reference)
8. [Roadmap](broken-reference)
9. [Change Log](broken-reference)
10. [License](broken-reference)
11. [Security](broken-reference)
12. [Contact](broken-reference)

</details>

### Discovering ESG assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each transaction on the Hedera network must contain a specific identifier in the memo field for discoverability. The Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. In the memo field of newly minted tokens, you will find a [Verifiable Link](https://github.com/InterWorkAlliance/Sustainability/blob/2d07029cade3050d76f716034593cb067d1c4e7f/vem/supply/verification.md) which will allow users to discover the published standard the token is following and the entire history of the ESG asset and corresponding data to be publicly discoverable. This is further defined in Hedera Improvement Proposal 28 (HIP-28)

([back to top](broken-reference))

### Getting Started

To get a local copy up and running, follow these simple example steps. When building the reference implementation, you can manually build every component or run one command with Docker.

#### Prerequisites

* [Docker](https://www.docker.com) (To build with one command)
* [MongoDB](https://www.mongodb.com) and [NodeJS](https://nodejs.org) (If you would like to manually build every component)
* [Hedera Testnet Account](https://portal.hedera.com)

#### Installation

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2.  Update the following files with your Hedera Testnet account info as indicated. Please keep in mind that this Hedera Operator ID and Operator Key is used for this reference implementation as a placeholder until there is a wallet integration. There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

    For example:

    in `ui-service/.env`:

    ```
    OPERATOR_ID=0.0.123456789
    OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
    ```

    in `ui-service/.env.docker`:

    ```
    OPERATOR_ID=0.0.123456789
    OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
    ```

    in `guardian-service/config.json`:

    ```
    {"OPERATOR_ID":"0.0.123456789","OPERATOR_KEY":"302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6"}
    ```

    * The `OPERATOR_ID` is the Hedera account's `accountId`
    * The `OPERATOR_KEY` is the Hedera account's `privateKey`
    * The `TOPIC_ID` is used when connecting to an existing topic. If you don't have one, delete the `TOPIC_ID` line.
3.  If you want to build with Docker (Once this step you are finished)

    ```
    docker-compose up -d --build
    ```
4.  If you want to manually build every component, then build and run the services in the following sequence: Message Broker, UI Service, Guardian Service, and lastly, the MRV Sender Service. See below for commands.

    **From the Message broker folder (Need to run first)**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service:

    ```
    npm start
    ```

    **From the UI Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on http://localhost:3002):

    ```
    npm start
    ```

    **From the Guardian Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on http://localhost:3004):

    ```
    npm start
    ```

    **From the MRV Sender Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on http://localhost:3005):

    ```
    npm start
    ```

([back to top](broken-reference))

### Unit Tests

To run **guardian-service** unit tests, following commands needs to be executed:

```
cd guardian-service 
npm run test
```

To run **vc-modules** unit tests, following commands needs to be executed:

```
cd vc-modules
npm run test
```

It is also an ability to run Hedera network test only. To do that, the following command needs to be executed:

```
npm run test:network
```

To run stability tests (certain transactions will be executed 10 times each), the following command needs to be executed:

```
npm run test:stability
```

To run **ui-service** unit tests, following commands needs to be executed:

```
cd ui-service
npm run test
```

To run **message-broker** unit tests, following commands needs to be executed:

```
cd message-broker
npm run test
```

([back to top](broken-reference))

### Swagger API

After successfully launching your application, you can find the generated Swagger API by [following this link](http://localhost:3002/api-docs).

([back to top](broken-reference))

### Postman Collection

Postman Collection that covers all available API endpoints could be found [here](https://github.com/hashgraph/guardian/tree/main/ui-service/api/Guardian%20API.postman\_collection.json).

([back to top](broken-reference))

### Demo Usage Guide

Navigate to the `/demo artifacts` folder for the Demo Usage Guide or [click here](https://github.com/hashgraph/guardian/tree/main/Demo%20Artifacts).

([back to top](broken-reference))

### Contribute a New Policy

We welcome all methodologies and workflow to be contributed to this repo as an open-source token template and Policy Workflow & Policy Action Execution instance. To do so, please follow the CONTRIBUTING.md instructions to submit a pull request.

This is critical to scaling the [Hedera Sustainability Ecosystem](https://github.com/dubgeis/HederaSustainabilityEcosystem/).

### Reference Implementation

This repo contains a reference implementation of the Guardian to learn how to use the components for various applications. This reference implementation is designed with modularity so that different components may be swapped out based on various implementation requirements. Please see the Guardian's architecture diagram below:

![Open Source Guardian Architecture](https://user-images.githubusercontent.com/40637665/137059380-94303137-b9e4-402c-bb67-9212b6f1c4f4.png)

([back to top](broken-reference))

### Built With

The Guardian solution is built with the following major frameworks/libraries.

#### Backend

* [NodeJS](https://nodejs.org)
* [MongoDB](https://www.mongodb.com)
* [Express](https://expressjs.com)
* [FastMQ](https://www.npmjs.com/package/fastmq)
* [TypeORM](https://typeorm.io)
* [Hedera-DID-JS-SDK](https://github.com/hashgraph/did-sdk-js)
* [W3C VC-JS-HTTP](https://w3c.github.io/vc-data-model/)

#### Frontend

* [Angular](https://angular.io)
* [crypto-browserify](https://www.npmjs.com/package/crypto-browserify)

([back to top](broken-reference))

### Roadmap

Roadmap TBA

* \[] Feature 1
  * \[] Nested Feature

See the [open issues](https://github.com/hashgraph/guardian/issues) for a full list of proposed features (and known issues).

([back to top](broken-reference))

### Change Log

All notable changes to this project will be documented in this CHANGELOG.md file.

([back to top](broken-reference))

### Contributing

Thank you for your interest in contributing to the Guardian!

We appreciate your interest in helping the rest of our community and us. We welcome bug reports, feature requests, and code contributions.

For contributing guidelines, please see the CONTRIBUTING.md here

([back to top](broken-reference))

### License

This repo is under Apache 2.0 License. See LICENSE for more information.

([back to top](broken-reference))

### Security

Please do not file a public ticket mentioning the vulnerability. Refer to the security policy defined in the SECURITY.md.

([back to top](broken-reference))

### Contact

For any questions, please reach out to the Envision Blockchain Solutions team at:

* Website: \<www.envisionblockchain.com>
* Email: [info@envisionblockchain.com](mailto:info@envisionblockchain.com)

([back to top](broken-reference))
