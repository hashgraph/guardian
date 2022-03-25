# Installation

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please keep in mind that this Hedera Operator ID and Operator Key is used for this reference implementation as a placeholder until there is a wallet integration. There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

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

3\. Update the following files with your NFT.Storage API KEY. Please follow the steps from [https://nft.storage/#getting-started](https://nft.storage/#getting-started) to obtain it.

For example:

in `ipfs-client/.env`:

```
NFT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVhNzVBQzEwMmM2QTlCQjc4NDI5NDNlMmMzMUNEMzBmRUNmNUVmMTIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY0MjQyODUxMDUzMywibmFtZSI6IklQRlMifQ.BjD1EJM1OBWmYClDbRoR1O9vrU3_5-Isb292w3PSSAI"
```

in `ipfs-client/.env.docker`:

```
NFT_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGVhNzVBQzEwMmM2QTlCQjc4NDI5NDNlMmMzMUNEMzBmRUNmNUVmMTIiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY0MjQyODUxMDUzMywibmFtZSI6IklQRlMifQ.BjD1EJM1OBWmYClDbRoR1O9vrU3_5-Isb292w3PSSAI"
```

4\. If you want to build with Docker. Please note that the Docker build is meant to be used in production and will not contain any debug information. (Once this step you are finished)

```
docker-compose up -d --build
```

5\. If you want to manually build every component with debug information, then build and run the services in the following sequence: Message Broker, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

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

To start the service (found on [http://localhost:3004](http://localhost:3004)):

```
npm start
```

**From the UI Service folder**

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3000](http://localhost:3000)):

```
npm start
```

**From the MRV Sender Service folder**

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3005](http://localhost:3005)):

```
npm start
```

([back to top](https://github.com/hashgraph/guardian/tree/develop#top))

{% hint style="info" %}
**Note**: Once you start the service, please wait for the Initialization Process to be completed.
{% endhint %}

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
