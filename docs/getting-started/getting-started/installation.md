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

3\. Update the following files with your Web3.Storage API KEY. Please follow the steps from [https://web3.storage/docs/#quickstart ](https://web3.storage/docs/#quickstart)to obtain it.

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

### How to Configure Hedera Local Node:

The following parameters needs to be added in .env / .env.docker file:

1. OPERATOR\_ID: The ID of the operation
2. OPERATOR\_Key: Private key of the operator\_
3. LOCALNODE\_ADDRESS : The address of the localnode server. This can be its IP address or a domain name
4. LOCALNODE\_PROTOCOL : Communication protocol for interactions with the local node, can be http or https.
5. HEDERA\_NET : Type of the Hedera node to transact.

Example:

```
OPERATOR_ID="0.0.2"
OPERATOR_KEY="302e020100300506032b65700422042091132178e72057a1d7528025956fe39b0b847f200ab59b2fdd367017f3087137"
LOCALNODE_ADDRESS="11.11.11.11"
LOCALNODE_PROTOCOL="http"
HEDERA_NET="localnode"
```

{% hint style="info" %}
Note:

1. The above value of the LOCALNODE\_ADDRESS is just for example. User need to add their own IP ADDRESS of their LocalNode instance.
2. Default value of HEDERA\_NET will be testnet. It should be set to localnode.
3. The values of OPERATOR\_ID, OPERATOR\_KEY are the ones used in the default LocalNode configuration.
4. Need to remove INITIALIZATION\_TOPIC\_ID as the topic will be created automatically.
5. LOCALNODE\_PROTOCOL can be http or https depending on server configuration (http is default)
{% endhint %}

To setup Local Node instance, please check the link : [https://github.com/hashgraph/hedera-local-node#docker](https://github.com/hashgraph/hedera-local-node#docker)

### Launching the Guardian

Once [http://localhost:3000](http://localhost:3000) is launched, we need to initialize Standard Registry by completing the Setup.

![](<../../.gitbook/assets/image (14) (1).png>)

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

| Parameter                              | Purpose                                                                            | Example                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| MQ\_ADDRESS                            | Web Socket Address                                                                 | localhost                                                                                        |
| SERVICE\_CHANNEL                       | Version of the Guardian                                                            | guardian.1                                                                                       |
| DB\_HOST                               | Hostname of the Database                                                           | localhost                                                                                        |
| DB\_DATABASE                           | Database Name                                                                      | guardian\_db                                                                                     |
| MAX\__TRANSACTION\_FEE_                | Maximum Transaction Fees Value                                                     | 10                                                                                               |
| INITIAL\_BALANCE                       | Initial Balance Value                                                              | 500                                                                                              |
| INITIAL\__STANDARD\_REGISTRY\_BALANCE_ | Setting Initial Standard Registry Balance                                          | 500                                                                                              |
| OPERATOR\_ID                           | The ID of the operation                                                            | 0.0.29676495                                                                                     |
| OPERATOR\_KEY                          | Private key of the operator                                                        | 302e020100300506032b657004220420dcb89b3fcb576879ee2df40ecd0404244c74d0e75fbad5d8f327805361c2c92e |
| LOCALNODE\_ADDRESS                     | The address of the localnode server. This can be its IP address or a domain name   | 1.1.1.1                                                                                          |
| LOCALNODE\_PROTOCOL                    | Communication protocol for interactions with the local node, can be http or https. | http/https                                                                                       |
| HEDERA\_NET                            | Type of the Hedera node to transact with                                           | testnet, localnode, mainnet                                                                      |
| INITIALIZATION\__TOPIC\_ID_            | The ID of the initialisation topic.                                                | 0.0.46022543                                                                                     |
| MESSAGE\_LANG                          | Language of the message text of all messages                                       | en-US                                                                                            |
| LOG\_LEVEL                             | level of the Logs                                                                  | 2                                                                                                |

{% hint style="info" %}
**Note:**

1. To configure LocalNode, please change the value of LOCALNODE\_ADDRESS
2. If HEDERA\_\_NET option is set to localnode, INITIALIZATION\_\_TOPIC\_ID can be empty in which case the topic will be created automatically.
{% endhint %}

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
