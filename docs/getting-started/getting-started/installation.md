# Installation

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation ID and Operator Key by looking at link : [Broken link](broken-reference "mention"). There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

For example:

in `guardian-service/.env`:

```
 OPERATOR_ID=""
 OPERATOR_KEY=""
```

in `guardian-service/.env.docker`:

```
 OPERATOR_ID=""
 OPERATOR_KEY=""
```

{% hint style="info" %}
**Note:** You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
{% endhint %}

3\. Update the following files with your Web3.Storage API KEY. Please follow the steps from [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart) to obtain it. To know complete information on generating API Key please check [Broken link](broken-reference "mention")

For example:

in `ipfs-client/.env`:

```
IPFS_STORAGE_API_KEY=""
```

or in `ipfs-client/.env.docker`:

```
IPFS_STORAGE_API_KEY=""
```

4\. Build and launch with Docker. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

```
docker-compose up -d --build
```

5\. Browse to [http://localhost:3000](http://localhost:3000) and complete the setup.

### Manual Installation

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for Manual Installation

* [MongoDB](https://www.mongodb.com/) ,
* &#x20;[NodeJS](https://nodejs.org/)&#x20;
* [Nats](https://nats.io/)&#x20;

#### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

1. Clone the repo

```
git clone https://github.com/hashgraph/guardian.git
```

2\. From the **interfaces** folder

Build package

```
npm install
npm run build
```

3\. From the **common** folder

Build package

```
npm install
npm run build
```

4\. From the **logger-service** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

5\. From the **auth-service** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

6\. From the **ipfs-client** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

7\. From the **guardian-service** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3004](http://localhost:3004)):

```
npm start
```

8\. From the **api-gateway** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
npm start
```

9\. From the **mrv-sender** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3005](http://localhost:3005)):

```
npm start
```

10.From the **frontend** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:4200](http://localhost:4200))

```
npm start
```

{% hint style="info" %}
**Note**: Once you start the service, please wait for the Initialization Process to be completed.
{% endhint %}

### How to Configure Hedera Local Node:

1. Install a Hedera Local Network following the [official documentation](https://github.com/hashgraph/hedera-local-node#docker)
2. Configure Guardian's configuration files `.env/.env.docker` accordingly:

```
OPERATOR_ID=""
OPERATOR_KEY=""
LOCALNODE_ADDRESS="11.11.11.11"
LOCALNODE_PROTOCOL="http"
HEDERA_NET="localnode"
```

{% hint style="info" %}
Note:

1. Set **LOCALNODE\_ADDRESS** to the IP address of your local node instance. The value above is given as example.
2. Set **HEDERA\_NET** to **localnode**. If not specified, the default value is **testnet.**
3. Configure **OPERATOR\_ID** _and_ **OPERATOR\_KEY** accordingly with your local node configuration.
4. Remove **INITIALISATION\_TOPIC\_ID** as the topic will be created automatically.
5. Set **LOCALNODE\_PROTOCOL** to **http** or **https** accordingly with your local node configuration (It uses HTTP by default).
{% endhint %}

1. OPERATOR\_ID: The ID of the operation
2. OPERATOR\_Key: Private key of the operator\_
3. LOCALNODE\_ADDRESS : The address of the localnode server. This can be its IP address or a domain name
4. LOCALNODE\_PROTOCOL : Communication protocol for interactions with the local node, can be http or https.
5. HEDERA\_NET : Type of the Hedera node to transact.

### Local development using Docker

1. create .env file at the root level and update all variable requires for docker.

```
cp .env.example .env
```

2\. Start local development using docker compose.

```
docker-compose -f docker-compose-dev.yml up --build
```

3\. Access local development using [http://localhost:3000](http://localhost:3000) or [http://localhost:4200](http://localhost:4200)

### Troubleshoot

#### To delete all the Docker Containers

```
docker builder prune --all
```

#### To run by cleaning Docker Cache

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

### Launching the Guardian

Once [http://localhost:3000](http://localhost:3000) is launched, we need to initialize Standard Registry by completing the Setup.

![](<../../.gitbook/assets/image (14).png>)

**Note:** The above fields in UI are mandatory only for this default Schema.

The Format of the Standard Registry Hello World Message is as follows:

```
{
	'type': 'Standard Registry',
	'id': '35c5d340-1a93-475d-9659-818bb77d45df',
	'did': 'did:hedera:testnet:vzN41A2bMhvYGhg7oCMoo5UAzQ6PCTq4VTQaNPE1uPG;hedera:testnet:tid=0.0.3423402',
	'action': 'Init',
	'topicId': '0.0.34234020',
	'lang': 'en-US',
    'attributes' : {
    	'ISIC': '051 062',
    	'geography' : 'USA CAN EU AUS',
    	'law': 'USA',
    	'tags': 'VERRA iREC'
  }
}
```

Where the list of `attributes` is extendable, and all attributes in it are **optional**.

#### Standard Registry Message Parameters

| Parameter | Purpose                            | Example                                                        |
| --------- | ---------------------------------- | -------------------------------------------------------------- |
| type      | Account Type                       | Standard Registry                                              |
| id        | Message ID                         | 35c5d340-1a93-475d-9659-818bb77d45df                           |
| did       | Hedera DID                         | did:hedera:testnet:vzN41A2bMhvYGhg7oCMoo5UAzQ6PCTq4VTQaNPE1uPG |
| action    | Action Type                        | Init                                                           |
| topicId   | Standard Registry Message Topic ID | 0.0.34234020                                                   |
| lang      | Language                           | ENG                                                            |
| ISIC      | ISIC code                          | 051                                                            |
| geography | Location                           | USA                                                            |
| law       | Country Law                        | USA                                                            |
| tags      | Policy Tags                        | Verra, iREC                                                    |

### .env Parameters

| Parameter                              | Purpose                                                                            | Example                     |
| -------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------- |
| MQ\_ADDRESS                            | Web Socket Address                                                                 | localhost                   |
| SERVICE\_CHANNEL                       | Version of the Guardian                                                            | guardian.1                  |
| DB\_HOST                               | Hostname of the Database                                                           | localhost                   |
| DB\_DATABASE                           | Database Name                                                                      | guardian\_db                |
| MAX\__TRANSACTION\_FEE_                | Maximum Transaction Fees Value                                                     | 10                          |
| INITIAL\_BALANCE                       | Initial Balance Value                                                              | 500                         |
| INITIAL\__STANDARD\_REGISTRY\_BALANCE_ | Setting Initial Standard Registry Balance                                          | 500                         |
| OPERATOR\_ID                           | The ID of the operation                                                            | -                           |
| OPERATOR\_KEY                          | Private key of the operator                                                        | -                           |
| LOCALNODE\_ADDRESS                     | The address of the localnode server. This can be its IP address or a domain name   | 1.1.1.1                     |
| LOCALNODE\_PROTOCOL                    | Communication protocol for interactions with the local node, can be http or https. | http/https                  |
| HEDERA\_NET                            | Type of the Hedera node to transact with                                           | testnet, localnode, mainnet |
| INITIALIZATION\__TOPIC\_ID_            | The ID of the initialisation topic.                                                | 0.0.46022543                |
| MESSAGE\_LANG                          | Language of the message text of all messages                                       | en-US                       |
| LOG\_LEVEL                             | level of the Logs                                                                  | 2                           |

### Summary of URLs and Ports

#### Using Docker:

| Folder         | URL                                                                        |
| -------------- | -------------------------------------------------------------------------- |
| WEB\_INTERFACE | [http://localhost:3000](http://localhost:3000)                             |
| API\_GATEWAY   | [http://localhost:3000/api/v1/](http://localhost:3000/api/v1/)             |
| MRV\_SENDER    | [http://localhost:3000/mrv-sender/](http://localhost:3000/mrv-sender/)     |
| TOPIC\_VIEWER  | [http://localhost:3000/topic-viewer/](http://localhost:3000/topic-viewer/) |
| API\_DOCS      | [http://localhost:3000/api-docs/v1/](http://localhost:3000/api-docs/v1/)   |

#### Not in Docker:

| Folder         | URL                                              |
| -------------- | ------------------------------------------------ |
| WEB\_INTERFACE | [http://localhost:4200/](http://localhost:4200/) |
| API\_GATEWAY   | [http://localhost:3002/](http://localhost:3002/) |
| MRV\_SENDER    | [http://localhost:3005/](http://localhost:3005/) |
| TOPIC\_VIEWER  | [http://localhost:3006/](http://localhost:3006/) |
| API\_DOCS      | [http://localhost:3001/](http://localhost:3001/) |

