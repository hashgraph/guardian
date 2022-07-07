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
```

in `guardian-service/.env.docker`:

```
 OPERATOR_ID="0.0.29676495"
 OPERATOR_KEY="302e020100300506032b6570042204202119d6291aab20289f12cdb27a0ae446d6b319054e3de81b03564532b8e03cad"
```

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

5\. If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

#### From the interfaces folder

Build package

```
npm install
npm run build
```

#### **From the common folder**

Build package

```
npm install
npm run build
```

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

#### From the Logger service folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

#### From the Auth service folder

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

**From the API Gateway Service folder**

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3002](https://localhost:3002)):

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

#### From the Frontend folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:4200](http://localhost:4200))

```
npm start
```

([back to top](https://github.com/hashgraph/guardian/tree/develop#top))

{% hint style="info" %}
**Note**: Once you start the service, please wait for the Initialization Process to be completed.
{% endhint %}

### Troubleshoot

To delete all the Docker Containers

```
docker builder prune --all
```

To run by cleaning Docker Cache

```
docker-compose build --no-cache
```

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

To run **message-broker** unit tests, following commands needs to be executed:

```
cd message-broker
npm run test
```

### .env Parameters&#x20;

| Parameter                   | Purpose                                                                                                  | Example                                                                                          |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| MQ\_ADDRESS                 | Web Socket Address                                                                                       | localhost                                                                                        |
| SERVICE\_CHANNEL            | Version of the Guardian                                                                                  | guardian.1                                                                                       |
| DB\_HOST                    | Hostname of the Database                                                                                 | localhost                                                                                        |
| DB\_DATABASE                | Database Name                                                                                            | guardian\_db                                                                                     |
| MAX\__TRANSACTION\_FEE_     | Maximum Transaction Fees Value                                                                           | 10                                                                                               |
| INITIAL\_BALANCE            | Initial Balance Value                                                                                    | 500                                                                                              |
| OPERATOR\_ID                | Operator ID of Hedera Testnet                                                                            | 0.0.29676495                                                                                     |
| OPERATOR\_KEY               | Operator Key of Hedera Testnet                                                                           | 302e020100300506032b657004220420dcb89b3fcb576879ee2df40ecd0404244c74d0e75fbad5d8f327805361c2c92e |
| HEDERA\_NET                 | Hedera Network name                                                                                      | testnet                                                                                          |
| INITIALIZATION\__TOPIC\_ID_ | ID of the topic where the Initialisation message is posted every time a new Standard Registry is created | 0.0.46022543                                                                                     |
| MESSAGE\_LANG               | Language of the message text of all messages                                                             | en-US                                                                                            |
| LOG\_LEVEL                  | level of the Logs                                                                                        | 2                                                                                                |

### Summary of URLs and Ports

#### Using Docker:

| Folder         | URL                                                                        |
| -------------- | -------------------------------------------------------------------------- |
| WEB\_INTERFACE | [http://localhost:3000](http://localhost:3000)                             |
| API\_GATEWAY   | [http://localhost:3000/api/v1/](http://localhost:3000/api/v1/)             |
| MRV\_SENDER    | [http://localhost:3000/mrv-sender/](http://localhost:3000/mrv-sender/)     |
| TOPIC\_VIEWER  | [http://localhost:3000/topic-viewer/](http://localhost:3000/topic-viewer/) |
| API\_DOCS      | [http://localhost:3000/api-docs/v1/](ttp://localhost:3000/api-docs/v1/)    |

#### Not in Docker:

| Folder         | URL                                              |
| -------------- | ------------------------------------------------ |
| WEB\_INTERFACE | [http://localhost:4200/](http://localhost:4200/) |
| API\_GATEWAY   | [http://localhost:3002/](http://localhost:3002/) |
| MRV\_SENDER    | [http://localhost:3005/](http://localhost:3005/) |
| TOPIC\_VIEWER  | [http://localhost:3006/](http://localhost:3006/) |
| API\_DOCS      | [http://localhost:3001/](http://localhost:3001/) |

