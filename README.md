# README

[![Apache 2.0 License](https://img.shields.io/hexpm/l/apa)](LICENSE) ![Build results](https://github.com/hashgraph/guardian/actions/workflows/main.yml/badge.svg?branch=main) ![GitHub package.json version (branch)](https://img.shields.io/github/package-json/v/hashgraph/guardian/master/guardian-service?label=version) [![](https://img.shields.io/discord/373889138199494658)](https://discord.com/channels/373889138199494658/898264469786988545)

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
* [MongoDB](https://www.mongodb.com), [NodeJS](https://nodejs.org) and [Nats](https://nats.io/) (If you build with docker these components will be installed automatically)
* [Hedera Testnet Account](https://portal.hedera.com)
* [NFT.Storage Account](https://nft.storage/#getting-started)

#### Docker Installation

1. Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please keep in mind that this Hedera Operator ID and Operator Key is used for this reference implementation as a placeholder until there is a wallet integration. There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

    For example:

    in `guardian-service/.env`:

    ```
    OPERATOR_ID="0.0.29676495"
    OPERATOR_KEY="302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad"
    ```

    in `guardian-service/.env.docker`:

    ```
    OPERATOR_ID="0.0.29676495"
    OPERATOR_KEY="302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad"
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
### To Configure Hedera LocalNode
Need to add following parameters in `.env/.env.docker`:
 ```
  OPERATOR_ID="0.0.2"
  OPERATOR_KEY="302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
  LOCALNODE_ADDRESS="11.11.11.11"
  LOCALNODE_PROTOCOL="http"
  HEDERA_NET="localnode"
  ``` 
   Note: 
   1. LOCALNODE_ADDRESS to be changed to your own instance IP Address.The above given value is just shown for an example.
   2. Default value of HEDERA_NET will be testnet. It should be set to localnode.
   3. The above values of OPERATOR_ID, OPERATOR_KEY are default one, which is used for LocalNode configuration.
   4. Need to remove INITIALIZATION_TOPIC_ID as the topic will be created automatically. 
   5. LOCALNODE_PROTOCOL can be http or https depending on server configuration (http is default)
   
To setup Local Node instance, please check the link : https://github.com/hashgraph/hedera-local-node#docker   
#### Manual Installation   
   
If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

  1. **From the interfaces folder**

   Build package
   ```sh
   npm install
   npm run build
   ```


  2. **From the common folder**

  Build package
  ```sh
  npm install
  npm run build
  ```

   3. **From the Logger service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service:

   ```
   npm start
   ```

   4. **From the Auth service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service:

   ```
   npm start
   ```

   5. **From the IPFS Client folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service:

   ```
   npm start
   ```
 
   6. **From the Guardian Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3004):

   ```
   npm start
   ```

   7. **From the API Gateway Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3002):

   ```
   npm start
   ```

   8. **From the MRV Sender Service folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:3005):

   ```
   npm start
   ```

   9. **From the Frontend folder**

   To build the service:

   ```
   npm install
   npm run build
   ```

   To start the service (found on http://localhost:4200):

   ```
   npm start
   ```
  ### Note: Once you start the service, please wait for the Initialization Process to be completed.
  
  ### Local development using docker
  1. create .env file at the root level and update all variable requires for docker
     ```sh
        cp .env.example .env
     ```
  2. Start local development using docker compose
     ```
      docker-compose -f docker-compose-dev.yml up --build

     ```
  3. Access local development using http://localhost:3000 or http://localhost:4200

  ### Troubleshoot 
  
  **To delete all the Containers**
   ```
   docker builder prune --all
   
   ```
   **To run by cleaning Docker Cache**
   
   ```
   docker-compose build --no-cache
   
   ```
([back to top](broken-reference))

### Unit Tests

To run **guardian-service** unit tests, following commands needs to be executed:

```
cd guardian-service 
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

* Website: \<www.envisionblockchain.com>
* Email: [info@envisionblockchain.com](mailto:info@envisionblockchain.com)

([back to top](broken-reference))


[license-url]: https://github.com/hashgraph/guardian/blob/main/LICENSE
