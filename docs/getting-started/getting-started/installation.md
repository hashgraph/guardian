# 🛠 Installation

### Build Guardian from source and run as docker containers

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation ID and Operator Key by looking at link: [how-to-create-operator-id-and-operator-key.md](how-to-create-operator-id-and-operator-key.md "mention"). There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the ./guardian/configs/.env.\<GUARDIAN\_ENV>.guardian.system will be used to generate demo accounts.

For example:

in ./guardian/.env you may choose name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data (for more details read at [Ecosystem Environments](../../guardian/readme/environments/ecosystem-environments.md))

```
GUARDIAN_ENV="develop"
```

in `./guardian/configs/.env.develop.guardian.system`

```
OPERATOR_ID="..."
OPERATOR_KEY="..."
```

{% hint style="info" %}
**Note:**

1. You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
{% endhint %}

3\. Now, we have two options to setup IPFS node : 1. Local node 2. IPFS Web3Storage node.

#### 3.1 Setting up IPFS Local node:

3.1.1 We need to install and configure any IPFS node.

For example: [https://github.com/yeasy/docker-ipfs](https://github.com/yeasy/docker-ipfs)

3.1.2 For setup IPFS local node you need to set variables in `./guardian/configs/.env.develop.guardian.system`&#x20;

```
IPFS_NODE_ADDRESS="..." # Default IPFS_NODE_ADDRESS="http://localhost:5002"
IPFS_PUBLIC_GATEWAY='...' # Default IPFS_PUBLIC_GATEWAY='https://localhost:8080/ipfs/${cid}'
IPFS_PROVIDER="local"
```

{% hint style="info" %}
Note:

1. Default IPFS\_NODE\_ADDRESS="[http://localhost:5002](http://localhost:5002/)"
2. Default IPFS\_PUBLIC\_GATEWAY="[https://localhost:8080/ipfs/${cid}](https://localhost:8080/ipfs/$%7Bcid%7D)"
{% endhint %}

#### 3.2 Setting up IPFS Web3Storage node:

3.2.1 For setup IPFS web3storage node you need to set variables in `./guardian/configs/.env.develop.guardian.system`:

```
IPFS_STORAGE_API_KEY="..."
IPFS_PROVIDER="web3storage"
```

To generate Web3.Storage API KEY. Please follow the steps from [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart) to obtain it. To know complete information on generating API Key please check : [how-to-generate-web3.storage-api-key.md](how-to-generate-web3.storage-api-key.md "mention")

4\. Build and launch with Docker. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

```
docker-compose up -d --build
```

{% hint style="info" %}
**Note:**

About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/
{% endhint %}

5\. Browse to [http://localhost:3000](http://localhost:3000) and complete the setup.

### Run pre-build containers from the repository

#### Docker compose configuration for apple M1 using images:

```
version: "3.8"
services:
  mongo:
    image: mongo
    command: "--setParameter allowDiskUseByDefault=true"
    restart: always
    expose:
      - 27017
 
  message-broker:
    image: nats:2.9.8
    expose:
      - 4222
    ports:
      - '8222:8222'
    command: '--http_port 8222'
 
  logger-service:
    image: gcr.io/hedera-registry/logger-service:2.9.3
    platform: linux/amd64
    depends_on:
      - message-broker
 
  worker-service-1:
    image: gcr.io/hedera-registry/worker-service:2.9.3
    platform: linux/amd64
    depends_on:
      - auth-service
    environment:
      SERVICE_CHANNEL: 'worker.1'
      IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDZhY0FFMmM3QjA5ODdCMjU1ZGZFMjMxZTA0YzI5NDZBZWI0YzE5NkQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjAwNzIyNzg4MDgsIm5hbWUiOiJ0ZXN0In0.vzt0-vBlbKiUSeyBZ6i3qTBKVMR3RL7CnkEXVNqvSH4'
 
  worker-service-2:
    image: gcr.io/hedera-registry/worker-service:2.9.3
    platform: linux/amd64
    depends_on:
      - auth-service
    environment:
      SERVICE_CHANNEL: 'worker.2'
      IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDZhY0FFMmM3QjA5ODdCMjU1ZGZFMjMxZTA0YzI5NDZBZWI0YzE5NkQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjAwNzIyNzg4MDgsIm5hbWUiOiJ0ZXN0In0.vzt0-vBlbKiUSeyBZ6i3qTBKVMR3RL7CnkEXVNqvSH4'
 
  auth-service:
    image: gcr.io/hedera-registry/auth-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - logger-service
 
  api-gateway:
    image: gcr.io/hedera-registry/api-gateway:2.9.3
    platform: linux/amd64
    expose:
      - 3002
    depends_on:
      - mongo
      - message-broker
      - guardian-service
      - auth-service
      - logger-service
 
  policy-service:
    image: gcr.io/hedera-registry/policy-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - auth-service
      - logger-service
 
  guardian-service:
    image: gcr.io/hedera-registry/guardian-service:2.9.3
    platform: linux/amd64
    depends_on:
      - mongo
      - message-broker
      - auth-service
      - logger-service
      - worker-service-1
      - worker-service-2
      - policy-service
    environment:
      OPERATOR_ID: '0.0.10295'
      OPERATOR_KEY: '302e020100300506032b65700422042022c85d6c64bda64aa458cf715314c5469b3b84c58690470f5289cbada3af8dfb'
 
  web-proxy:
    image: gcr.io/hedera-registry/frontend:2.9.3
    platform: linux/amd64
    environment:
      GATEWAY_HOST: 'api-gateway'
      GATEWAY_PORT: '3002'
      GATEWAY_CLIENT_MAX_BODY_SIZE: '1024m'
    ports:
      - "3000:80"
    depends_on:
      - guardian-service
      - auth-service
      - api-gateway
volumes:
  mongo:
  # volume-guardian-service:
  # volume-ui-service:
  # volume-mrv-sender:
  #  volume-message-broker:
```

### (Advanced) Build executables and run manually

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for Manual Installation

* [MongoDB](https://www.mongodb.com/) ,
* [NodeJS](https://nodejs.org/)
* [Nats](https://nats.io/)

#### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

Configure .env file in each service

in `guardian-service/.env:`

```
GUARDIAN_ENV="develop"
```

If need to configure OVERRIDE variables add it in .env file.

```
OVERRIDE="false" 
```

in `guardian-service/configs/.env.guardian.develop:`

```
OPERATOR_ID="..."
OPERATOR_KEY="..."
```

{% hint style="info" %}
**Note**: Once you start the service, please wait for the Initialization Process to be completed.
{% endhint %}

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

### INITIALIZATION\_TOPIC\_ID for different Hedera Networks

| Network    | INITIALIZATION\_TOPIC\_ID |
| ---------- | ------------------------- |
| Mainnet    | 0.0.1368856               |
| Testnet    | 0.0.2030                  |
| Previewnet | 0.0.155110                |

### Launching the Guardian

Once [http://localhost:3000](http://localhost:3000) is launched, we need to first generate Operator ID and Operator Key by clicking on Generate button as shown below:

<figure><img src="../../.gitbook/assets/image (18) (3).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: If OPERATORID and OPERATOR KEY are added in .env file, we can click on Generate button directly without entering the details again in the UI.
{% endhint %}

Once you generated Operator ID and Operator Key, we can either click on Next or restore the Data, by selecting Restore Data from the Next button dropdown to setup Registry as shown below.

**Note**: Restore Data can be restored from Hedera if data is available for setting up the Registry.

<figure><img src="../../.gitbook/assets/image (21) (3).png" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
**Limitations on restoring the data:**\
1\. The state of policy workflows is not persisted onto any decentralised storage used by Guardian (such as IPFS and/or Hedera blockchain), and therefore not available for restoring. This means that while all artifacts produced by projects and their respective Policy workflows will be discovered and made accessible through the restored Guardian, the policy execution state will not be restored.

2\. Similarly, dynamic filled ‘options’ from VCs is not available at restoration time. This results in the limitation that some document grids will not be restored.
{% endhint %}

If Next is clicked, we need to manually setup the Registry or if Restore Data is clicked, it is filled automatically.

![](<../../.gitbook/assets/image (14) (3).png>)

**Note:** The above fields in UI are mandatory only for this default Schema.

The Format of the Standard Registry Hello World Message is as follows:

```
{
	'type': 'Standard Registry',
	'status':'ISSUE'
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
| status    | status of the message              | ISSUE                                                          |
| id        | Message ID                         | 35c5d340-1a93-475d-9659-818bb77d45df                           |
| did       | Hedera DID                         | did:hedera:testnet:vzN41A2bMhvYGhg7oCMoo5UAzQ6PCTq4VTQaNPE1uPG |
| action    | Action Type                        | Init                                                           |
| topicId   | Standard Registry Message Topic ID | 0.0.34234020                                                   |
| lang      | Language                           | ENG                                                            |
| ISIC      | ISIC code                          | 051                                                            |
| geography | Location                           | USA                                                            |
| law       | Country Law                        | USA                                                            |
| tags      | Policy Tags                        | Verra, iREC                                                    |

### .env / .env.docker Parameters in `guardian-service`

| Parameter                              | Purpose                                                                                                                             | Example                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| MQ\_ADDRESS                            | Web Socket Address                                                                                                                  | localhost                          |
| SERVICE\_CHANNEL                       | Version of the Guardian                                                                                                             | guardian.1                         |
| DB\_HOST                               | Hostname of the Database                                                                                                            | localhost                          |
| DB\_DATABASE                           | Database Name                                                                                                                       | guardian\_db                       |
| INITIAL\_BALANCE                       | Initial Balance Value                                                                                                               | 500                                |
| INITIAL\__STANDARD\_REGISTRY\_BALANCE_ | Setting Initial Standard Registry Balance                                                                                           | 500                                |
| OPERATOR\_ID                           | The ID of the operation                                                                                                             | -                                  |
| OPERATOR\_KEY                          | Private key of the operator                                                                                                         | -                                  |
| LOCALNODE\_ADDRESS                     | The address of the localnode server. This can be its IP address or a domain name                                                    | 1.1.1.1                            |
| LOCALNODE\_PROTOCOL                    | Communication protocol for interactions with the local node, can be http or https.                                                  | http/https                         |
| HEDERA\_NET                            | Type of the Hedera node to transact with                                                                                            | testnet, localnode, mainnet        |
| INITIALIZATION\__TOPIC\_ID_            | The ID of the initialization topic.                                                                                                 | 0.0.2030                           |
| MESSAGE\_LANG                          | Language of the message text of all messages                                                                                        | en-US                              |
| LOG\_LEVEL                             | Level of the Logs                                                                                                                   | 2                                  |
| SEND\_KEYS\_TO\_VAULT                  | Checked if keys to be sent to vault                                                                                                 | True/False                         |
| MULTI\_POLICY\_SCHEDULER               | to set custom cron mask (timer mask) for sync job                                                                                   | 0 0 \* \* \*                       |
| CONTRACT\_FILE\_ID                     | Defines the file identifier in hedera to create smart-contract.                                                                     | 0.0.6276                           |
| MQ\_MESSAGE\_CHUNK                     | To set up the message chunk size                                                                                                    | 500000                             |
| HEDERA\_CUSTOM\_NODES                  | Define hedera nodes to execute and pay transaction fee                                                                              | 0.testnet.hedera.com:50211":"0.0.3 |
| HEDERA\_CUSTOM\_MIRROR\_NODES          | Define hedera mirror nodes                                                                                                          | testnet.mirrornode.hedera.com:443" |
| MAP\_API\_KEY                          | Defines api to integrate Map schema type                                                                                            | ALZ\_X.....                        |
| DOCUMENT\_CACHE\_FIELD\_LIMIT          | Defines document field symbols limit for caching.                                                                                   | 500                                |
| BATCH\_NFT\_MINT\_SIZE                 | Defines size of batch of mint NFT transaction                                                                                       | 10                                 |
| DIRECT\_MESSAGE\_PORT                  | Port for direct messages (if not set generate random port)                                                                          | 300                                |
| DIRECT\_MESSAGE\_HOST                  | Host for direct messages (if not set get hostname)                                                                                  | localhost                          |
| DIRECT\_MESSAGE\_PROTOCOL              | Protocol https or http (http by default, https need additional server like nginx)                                                   | http                               |
| MQ\_MAX\_PAYLOAD                       | Max message size for send via message-broker (otherwise create direct message) if not set always send messages using message broker | 35                                 |

{% hint style="info" %}
**Important Note:**

Values from .env file need to be set up only on first start (when db or vault are empty). Then later if you want it to be changed, you can change it through Settings from admin Panel or through API.
{% endhint %}

### .env / .env.docker Parameters in api-gateway

| Parameter                 | Purpose                                                                                                                             | Example                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| MQ\_ADDRESS               | Web Socket Address                                                                                                                  | message-broker            |
| SERVICE\_CHANNEL          | Channel of the service                                                                                                              | api-gateway               |
| MRV\_ADDRESS              | MRV Address location                                                                                                                | http://message-broker/mrv |
| MQ\_MESSAGE\_CHUNK        | To set up the message chunk size                                                                                                    | 500000                    |
| RAW\_REQUEST\_LIMIT       | Define request limit                                                                                                                | 1 gb                      |
| JSON\_REQUEST\_LIMIT      | Define limit for body in Json format                                                                                                | 1 gb                      |
| DIRECT\_MESSAGE\_PORT     | Port for direct messages (if not set generate random port)                                                                          | 300                       |
| DIRECT\_MESSAGE\_HOST     | Host for direct messages (if not set get hostname)                                                                                  | localhost                 |
| DIRECT\_MESSAGE\_PROTOCOL | Protocol https or http (http by default, https need additional server like nginx)                                                   | http                      |
| MQ\_MAX\_PAYLOAD          | Max message size for send via message-broker (otherwise create direct message) if not set always send messages using message broker | 35                        |

### Summary of URLs and Ports

#### Using Docker:

<table><thead><tr><th width="216.33333333333326">Folder</th><th>URL</th><th>Target Deployment</th></tr></thead><tbody><tr><td>WEB_INTERFACE</td><td><a href="http://localhost:3000">http://localhost:3000</a></td><td>Production</td></tr><tr><td>API_GATEWAY</td><td><a href="http://localhost:3000/api/v1/">http://localhost:3000/api/v1/</a></td><td>Production</td></tr><tr><td>MRV_SENDER</td><td><a href="http://localhost:3000/mrv-sender/">http://localhost:3000/mrv-sender/</a></td><td>Demo</td></tr><tr><td>TOPIC_VIEWER</td><td><a href="http://localhost:3000/topic-viewer/">http://localhost:3000/topic-viewer/</a></td><td>Demo</td></tr><tr><td>API_DOCS</td><td><a href="http://localhost:3000/api-docs/v1/">http://localhost:3000/api-docs/v1/</a></td><td>Demo</td></tr><tr><td>MONGO-ADMIN-PANEL</td><td><a href="http://localhost:3000/mongo-admin">http://localhost:3000/mongo-admin</a></td><td>Demo</td></tr></tbody></table>

#### Not in Docker:

| Folder         | URL                                              | Target Deployment |
| -------------- | ------------------------------------------------ | ----------------- |
| WEB\_INTERFACE | [http://localhost:4200/](http://localhost:4200/) | Production        |
| API\_GATEWAY   | [http://localhost:3002/](http://localhost:3002/) | Production        |
| MRV\_SENDER    | [http://localhost:3005/](http://localhost:3005/) | Demo              |
| TOPIC\_VIEWER  | [http://localhost:3006/](http://localhost:3006/) | Demo              |
| API\_DOCS      | [http://localhost:3001/](http://localhost:3001/) | Demo              |
