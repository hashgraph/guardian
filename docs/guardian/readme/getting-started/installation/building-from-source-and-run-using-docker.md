# 🔨 Building from source and run using Docker

The following steps need to be executed in order to start Guardian using docker:

1. Clone the repo
2. Configure project level .env file
3. Update BC access variables
4. Setup IPFS
5. Build and launch with Docker
6. Browse to [http://localhost:3000](http://localhost:3000)

Here the steps description follows, for other practical examples go to 
* [Steps to deploy Guardian using a specific Environment( DEVELOP)](https://docs.hedera.com/guardian/guardian/readme/getting-started/examples/steps-to-deploy-guardian-using-a-specific-environment-develop)
* [Steps to deploy Guardian using a specific Environment ( QA)](https://docs.hedera.com/guardian/guardian/readme/getting-started/examples/steps-to-deploy-guardian-using-a-specific-environment-QA)
* [Steps to deploy Guardian using default Environment](https://docs.hedera.com/guardian/guardian/readme/getting-started/examples/steps-to-deploy-guardian-using-default-environment) 

1. Clone the repo

```
git clone https://github.com/hashgraph/guardian.git
```

2. Configure project level .env file
The main configuration files that needs to be provided to the Guardian system are the ".env" file.
Cut and past the **.env.template** renaming it as **.env** here you may choose the name of the Guardian platform. Leave the field empty or unspecified if you update a production environment to keep previous data (for more details read at https://docs.hedera.com/guardian/guardian/readme/environments/ecosystem-environments)
   
   for this example pourpose let's name the Guardian platform as "develop"

    ```shell
      GUARDIAN_ENV="develop"
    ```

3. Update the following files with your Hedera Testnet account info (see prerequisites) as indicated. Please check complete steps to generate Operation_ID and Operator_Key by looking at link: [How to Create Operator_ID and Operator_Key](https://docs.hedera.com/guardian/getting-started/getting-started/how-to-create-operator-id-and-operator-key). 

The Operation_ID and Operator_Key are all what Guardian needs to access the Hedera Blockchain assuming a role on it. This parameters needs to be configured in a file at the path "guardian/configs" the file should use the following naming convention: 

   * guardian/configs/.env.\<GUARDIAN_ENV\>.guardian.system

There will be other steps in the Demo Usage Guide that will be required for the generation of Operator_ID and Operator_Key. It is important to mention that the Operator_ID and Operator_Key in the ```guardian/configs/.env.\<GUARDIAN_ENV\>.guardian.system``` will be used to generate demo accounts.

   For example:
 
   following the previous example the file ```/configs/.env.develop.guardian.system``` is already provided in the folder as example, update the variables OPERATOR_ID and OPERATOR_KEY in this file.

   ```plaintext
   OPERATOR_ID="..."
   OPERATOR_KEY="..."
   ```
   {% hint style="info" %}
   **Note**. You can use the Schema Topic ID (`INITIALIZATION_TOPIC_ID`) already present in the configuration files, or you can specify your own.
   {% endhint %}

   {% hint style="info" %}
   **Note** for any other GUARDIAN_ENV name of your choice just copy and past the file ```/configs/.env.template.guardian.system``` and rename as ```/configs/.env.<choosen name>.guardian.system```
   {% endhint %}

4\. Now, we have two options to setup IPFS node : 1. Local node 2. IPFS Web3Storage node.

#### 4.1 Setting up IPFS Local node:

4.1.1 We need to install and configure any IPFS node.

For example: [https://github.com/yeasy/docker-ipfs](https://github.com/yeasy/docker-ipfs)

4.1.2 For setup IPFS local node you need to set variables in `./guardian/configs/.env.develop.guardian.system`

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

#### 4.2 Setting up IPFS Web3Storage node:

4.2.1 For setup IPFS web3storage node you need to set variables in `./guardian/configs/.env.develop.guardian.system`:

```
IPFS_STORAGE_API_KEY="..."
IPFS_PROVIDER="web3storage"
```

To generate Web3.Storage API KEY. Please follow the steps from [https://web3.storage/docs/#quickstart](https://web3.storage/docs/#quickstart) to obtain it. To know complete information on generating API Key please check : [how-to-generate-web3.storage-api-key.md](../../../../getting-started/getting-started/how-to-generate-web3.storage-api-key.md "mention")

5\. Build and launch with Docker. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/. Please note that this build is meant to be used in production and will not contain any debug information. From the project's root folder:

```
docker-compose up -d --build
```

{% hint style="info" %}
**Note:**

About docker-compose: from the end of June 2023 Compose V1 won’t be supported anymore and will be removed from all Docker Desktop versions. Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/
{% endhint %}

6\. Browse to [http://localhost:3000](http://localhost:3000) and complete the setup. To get more info, please check: [Launching Guardian](broken-reference/)

### Troubleshoot

#### To delete all the Docker Containers

```
docker builder prune --all
```

#### To run by cleaning Docker Cache

```
docker-compose build --no-cache
```
