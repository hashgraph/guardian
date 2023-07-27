# 🔨 Building from source and run using Docker

1. Clone the repo

```
git clone https://github.com/hashgraph/guardian.git
```

2. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation ID and Operator Key by looking at link: [how-to-create-operator-id-and-operator-key.md](../../../../getting-started/getting-started/how-to-create-operator-id-and-operator-key.md "mention"). There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the ./guardian/configs/.env.\<GUARDIAN\_ENV>.guardian.system will be used to generate demo accounts.

For example:

in ./guardian/.env you may choose name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data (for more details read at [Ecosystem Environments](../../environments/ecosystem-environments.md))

```
GUARDIAN_ENV="develop"
```

in `./guardian/configs/..env.guardian.system`

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

3.1.2 For setup IPFS local node you need to set variables in `./guardian/configs/..env.guardian.system`

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

To generate Web3.Storage API KEY. Please follow the steps from [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart) to obtain it. To know complete information on generating API Key please check : [how-to-generate-web3.storage-api-key.md](../../../../getting-started/getting-started/how-to-generate-web3.storage-api-key.md "mention")

4\. Build and launch with Docker. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

```
docker-compose up -d --build
```

{% hint style="info" %}
**Note:**

About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/
{% endhint %}

5\. Browse to [http://localhost:3000](http://localhost:3000) and complete the setup. To get more info, please check: [Launching Guardian](broken-reference/)

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
