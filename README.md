# README

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/ui-service?label=version) [![](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545)

## Guardian

The Guardian is a modular open-source solution that includes best-in-class identity management and decentralized ledger technology (DLT) libraries. At the heart of the Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications to offer a requirements-based tokenization implementation.

[HIP-19](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-19.md) · [HIP-28](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-28.md) · [HIP-29](https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-29.md) · [Report a Bug](https://github.com/hashgraph/guardian/issues) · [Request a Policy or a Feature](https://github.com/hashgraph/guardian/issues)

### Discovering ESG assets on Hedera

As identified in Hedera Improvement Proposal 19 (HIP-19), each transaction on the Hedera network must contain a specific identifier in the memo field for discoverability. The Guardian demonstrates this when every Hedera Consensus Service transaction is logged to a Hedera Consensus Service Topic. Observing the Hedera Consensus Service Topic, you can discover newly minted tokens. In the memo field of newly minted tokens, you will find a [Verifiable Link](https://github.com/InterWorkAlliance/Sustainability/blob/2d07029cade3050d76f716034593cb067d1c4e7f/vem/supply/verification.md) which will allow users to discover the published standard the token is following and the entire history of the ESG asset and corresponding data to be publicly discoverable. This is further defined in Hedera Improvement Proposal 28 (HIP-28)

([back to top](broken-reference))

### Getting Started

To get a local copy up and running, follow these simple example steps. When building the reference implementation, you can manually build every component or run one command with Docker.

#### Prerequisites

* [Docker](https://www.docker.com) (To build with one command)
* [MongoDB](https://www.mongodb.com) and [NodeJS](https://nodejs.org) (If you would like to manually build every component)
* [Hedera Testnet Account](https://portal.hedera.com)
* [NFT.Storage Account](https://nft.storage/#getting-started)

#### Installation

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2.  Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please keep in mind that this Hedera Operator ID and Operator Key is used for this reference implementation as a placeholder until there is a wallet integration. There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

    For example:

    in `guardian-service/.env`:

    ```
    OPERATOR_ID="0.0.29676495"
    OPERATOR_KEY="302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad"
    SCHEMA_TOPIC_ID="0.0.29614911"
    ```

    in `guardian-service/.env.docker`:

    ```
    OPERATOR_ID="0.0.29676495"
    OPERATOR_KEY="302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad"
    SCHEMA_TOPIC_ID="0.0.29614911"
    ```

    Note: You can use the Schema Topic ID listed above or you can enter your own if you have one.

3. Update the following files with your NFT.Storage API KEY. Please follow the steps from https://nft.storage/#getting-started to obtain it.

   For example:

   in `ipfs-client/.env`:

   ```
   NFT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVhNzVBQzEwMmM2QTlCQjc4NDI5NDNlMmMzMUNEMzBmRUNmNUVmMTIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY0MjQyODUxMDUzMywibmFtZSI6IklQRlMifQ.BjD1EJM1OBWmYClDbRoR1O9vrU3_5-Isb292w3PSSAI"
   ```

   in `ipfs-client/.env.docker`:

   ```
   NFT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVhNzVBQzEwMmM2QTlCQjc4NDI5NDNlMmMzMUNEMzBmRUNmNUVmMTIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY0MjQyODUxMDUzMywibmFtZSI6IklQRlMifQ.BjD1EJM1OBWmYClDbRoR1O9vrU3_5-Isb292w3PSSAI"
   ``` 
4. If you want to build with Docker. Please note that the Docker build is meant to be used in production and will not contain any debug information. (Once this step you are finished)
   ```
   docker-compose up -d --build
   ```
5. If you want to manually build every component with debug information, then build and run the services in the following sequence: Message Broker, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

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

   **From the IPFS Client folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service:

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

### API Tests

To run the API tests you need to build the application as described in the Installation section and fill
all .env files in the api-tests/configs folder. Then run this command in the api-tests directory:
```
npm run test
```

([back to top](broken-reference))

For complete documentation on following points. Please refer https://docs.hedera.com/guardian

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
### Contact

For any questions, please reach out to the Envision Blockchain Solutions team at:

* Website: <www.envisionblockchain.com>
* Email: [info@envisionblockchain.com](mailto:info@envisionblockchain.com)

([back to top](broken-reference))


[license-url]: https://github.com/hashgraph/guardian/blob/main/LICENSE
