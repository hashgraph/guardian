# Ecosystem Environments

The set of environment parameters represent the context in which a service is executed. Each service needs to know this context to adapt its behavour to the real working condition. At the service level the node .env library allows to read environment of the kind \<key,value> this library by default reads from .env file. The data are reads in a process .environment data structure available in the execution context of Node process. A unique file defines the environment and keeps the responsibility to create the shared operative ecosystem.

All Guardian Micro-services share a common set of Environment variables. In this way, Guardian can be seen as an ecosystem with several services and common set of parameters leading his behavour. This environment parameters are shared between all the services of the Guardian ecosystem. All variables are defined in a `.env.<GUARDIAN_ENV>.guardian.system` file. The file name is parametric so it is possible to define a different files for different possible running configuration, for example production, develop, test1. The ecosystem environment file follow the .env.template.guardian.system file that let write new configurations with the set of necessary variables. Both the template file and the resulting environments files are in the folder `./configs/`, they can be discriminated by its name to spread the session.

<figure><img src="https://camo.githubusercontent.com/ac5090d84e706daad4e1c9e9df910197a031ec116411353a4cf307f7b7c02cc0/68747470733a2f2f696d616765732e7a656e68756275736572636f6e74656e742e636f6d2f3633646265326264346434643632393062656436373830632f31323739306364362d313962352d346633632d616164322d396432383038316538343938" alt=""><figcaption></figcaption></figure>

The parameter GUARDIAN\_ENV is defined univocally in an `.env` file. The containers orchestration will be responsible to push the environment in to the container in a way the environment will be available to the Node server. For example in the execution of Guardian using docker compose tool the tool inject the environment in each container. Docker compose push the environment in the container by the means of the env-file attribute and the environment attribute. Environment attribute can be parametrized using the variables defined in the `.env` file located next to the docker\_compose.yaml this paramenter is used to select the file to read the environment variables from. All the variables defined in the file will be loaded in the container environment and be available to Node.

Also Guardian services are allowed to define specific service variables. This different set of variables allow to have a hierarchical definition of the same variable in a way that a developer could redefine some of them in a service specific way or add new variables extending the usage of the ecosystem environment. The environment variables that are specific to services can be specified by the means of `.env.<service_name>.<GUARDIAN_ENV>` files located in each service at `guardian/<service_name>/configs` subfolder.

It has been added a new environment variable named OVERRIDE that can assume values as "true"/"false"  to let the variables defined in the `.env.<service_name>.<GUARDIAN_ENV>.<GUARDIAN_ENV>` to override the common defined ecosystem variables or only add the new ones. 

For example If OVERRIDE=true a variable with the same name as the one already defined in the `.env.<GUARDIAN_ENV>.guardian.system` file will assume the value specify at service level. The OVERRIDE parameter is not mandatory. if OVERRIDE="false" (default value) specific service variables can only be added to the global ones. In each service a new `./configs` folder holds the set of parametric service level environment files.

In this way it is possible to use the ecosystem environment plus the service specific variables leaving the service specific variables under the responsibility of the service itself.

 The same service specific configuration are used when Guardian is bootstrapped without the docker compose orchestrator in the per service way. In this case every service environment is configured using the two files:

1. `.env` file in the specific service folder `./guardian/<service_name>`
2. `./<service_name>/configs/.env.<service_name>.<GUARDIAN_ENV>` file.

The Environment is read in two steps: at first steps the service .env file at service folder `./guardian/<service_name>` is loaded by Node while at second step `.env.<service_name>.\<GUARDIAN_ENV>` file is loaded. 

For example If OVERRIDE=true a variable with the same name as the one already defined in the `.env` file will assume the value specify at service level. 

### EXAMPLES:

### 1) Docker Compose Configuration

The following configuration will ignore the guardian-service configuration for variables with same name using only the ecosystem configuration while will add the new specific guardian-service variables for newly defined variables like DB\_HOST="localhost", DB\_DATABASE="guardian\_db" etc..

#### At root level:

* in ./guardian/.env

```
GUARDIAN_ENV="develop"
```

* in ./guardian/configs/.env.develop.guardian.system

```
# ECOSYSTEM ENVIRONMENT VARIABLES AND FEATURES

# OVERRIDE - default "false"
# ---------------------------
# OVERRIDE="false"

# HEDERA_NET - MANDATORY
# ------------------------
HEDERA_NET="testnet"

# PRE USED HEDERA_NET
# ---------------------
PREUSED_HEDERA_NET="testnet"

# TESTNET
OPERATOR_ID="0.0.3422318"
OPERATOR_KEY="302e020100300506032b6570042..................34c805215e7099b30abd63fd1c58bd3c"
INITIALIZATION_TOPIC_ID="0.0.2411"
.......
.....

```

#### At Guardian-service level:

in file ./guardian/guardian-service/configs/.env.guardian.develop

```
    HEDERA_NET="localnode"
    PREUSED_HEDERA_NET="localnode"
    MQ_ADDRESS="localhost"
    SERVICE_CHANNEL="guardian.1"
    DB_HOST="localhost"
    DB_DATABASE="guardian_db"
    INITIAL_BALANCE="100"
    INITIAL_STANDARD_REGISTRY_BALANCE="100"

    # TESTNET
    OPERATOR_ID="0.0.4523185"
    OPERATOR_KEY="302e02010030050603.........................05215e7099b30abd63fd1c58bd3c"
    INITIALIZATION_TOPIC_ID="0.0.2411"
```

#### RUN TIME RESULT

The following environment is loaded by the service.

```
HEDERA_NET="testnet"
PREUSED_HEDERA_NET="testnet"
MQ_ADDRESS="message-broker"
SERVICE_CHANNEL="guardian.1"
DB_HOST="mongo"
DB_DATABASE="guardian_db"
INITIAL_BALANCE="100"
INITIAL_STANDARD_REGISTRY_BALANCE="100"

# TESTNET
OPERATOR_ID="0.0.3422318"
OPERATOR_KEY="302e020100300506032b6570042..................34c805215e7099b30abd63fd1c58bd3c"
INITIALIZATION_TOPIC_ID="0.0.2411"
```

this shows that the root level environment is loaded: OPERATOR_ID defined in the root level "0.0.3422318" is used while "0.0.4523185" specified at service level remains unused.

### 2) Docker Compose Configuration to maintain the same database already in use

#### At root level:

in ./guardian/.env

```
GUARDIAN_ENV=""
```

in ./guardian/configs/.env..guardian.system

```
# ECOSYSTEM ENVIRONMENT VARIABLES AND FEATURES

# OVERRIDE - default "false"
# ---------------------------
# OVERRIDE="false"

# HEDERA_NET - MANDATORY
# ------------------------
HEDERA_NET="mainnet"

# PRE USED HEDERA_NET
# ---------------------
PREUSED_HEDERA_NET="mainnet"

# TESTNET
OPERATOR_ID="0.0.3422318"
OPERATOR_KEY="302e020100300506032b6570042..................34c805215e7099b30abd63fd1c58bd3c"
INITIALIZATION_TOPIC_ID="0.0.2411"
.........
.......

```

#### At Guardian-service level:

```
in ./guardian/guardian-service/configs/.env.guardian
```

```
HEDERA_NET="localnode"
PREUSED_HEDERA_NET="localnode"
MQ_ADDRESS="localhost"
SERVICE_CHANNEL="guardian.1"
DB_HOST="localhost"
DB_DATABASE="guardian_db"
INITIAL_BALANCE="100"
INITIAL_STANDARD_REGISTRY_BALANCE="100"

# TESTNET
OPERATOR_ID="0.0.4523185"
OPERATOR_KEY="302e02010030050603.........................05215e7099b30abd63fd1c58bd3c"
INITIALIZATION_TOPIC_ID="0.0.2411"
```

#### RUN TIME RESULT:

At Guardian service level the following environment is loaded at runtime

```
HEDERA_NET="mainnet"
PREUSED_HEDERA_NET="mainnet"
MQ_ADDRESS="message-broker"
SERVICE_CHANNEL="guardian.1"
DB_HOST="mongo"
DB_DATABASE="guardian_db"
INITIAL_BALANCE="100"
INITIAL_STANDARD_REGISTRY_BALANCE="100"

# TESTNET
OPERATOR_ID="0.0.3422318"
OPERATOR_KEY="302e020100300506032b6570042..................34c805215e7099b30abd63fd1c58bd3c"
INITIALIZATION_TOPIC_ID="0.0.2411"
```

###  3) Configure each service without an orchestrator

Configure .env, in ./guardian/\<service\_name\>/.env. Insert the variable GUARDIAN\_ENV and give it the name that you choose for you Guardian platform environment (production, develop ...). If you update a production environment to keep working with your previous data leave the field GUARDIAN\_ENV="" empty.

The OVERRIDE variable is not mandatory and it default to "false".

```
GUARDIAN_ENV="develop"
# OVERRIDE="false"
```

Every variable that is used by the service is configured inside the .guardian/\<service\_name\>/configs folder. Because GUARDIAN\_ENV is configured as "develop" each service configuration are stored in files with format `./<service_name>/configs/.env.<service_mane>.develop` that follows the template in the same folder.

Configure the guardian-service in ./guardian/guardian-service/configs/.env.guardian.develop

```
OPERATOR_ID="..."
OPERATOR_KEY="..."
```

Configure the worker-service in ./guardian/worker-service/configs/.env.worker.develop

```
IPFS_TIMEOUT="720"
IPFS_PROVIDER="web3storage" # 'web3storage' or 'local'
#Single quote IPFS_PUBLIC_GATEWAY
IPFS_PUBLIC_GATEWAY='https://ipfs.io/ipfs/${cid}'
IPFS_STORAGE_API_KEY="..."
IPFS_NODE_ADDRESS="http://ipfs-node:5002"
```

### 4) To use the docker-compose configuration and overriding specific service

The docker compose file to be used for this alternative is docker-compose\_SSV.yaml together with the .env\_SSV in the ./configs folder. Using this configuration both the ecosystem common variables and the service specific variables will be configured in the root folder. using the .env file for specific services variables and the `./config/.env.<GUARDIAN_ENV>.guardian.system` for ecosystem variables.

Follow the steps:

```
    - backup .env file
        $ mv ./.env ./.env_bck

    - copy the .env_SSV file from ./configs.
        the .env_SSV file allow to keep not just the GUARDIAN_ENV:guardian environment name but the Specific Service Variables too in a way to let docker compose have visibility at container bootstrap.
        $ cp ./configs/.env_SSV ./.env

    - backup docker-compose.yml
        $ mv ./docker-compose.yml .docker-compose.bck

    - copy the .docker-compose_SSV.yml in docker.compose.yml
        the docker-compose_SSV.yml contains the overriding between the env-files withe the service specific variables in the "environment" attribute per every service
        $ cp .docker-compose_SSV.yml in docker.compose.yml
    
    - run the docker compose without rebuild
        $ docker compose up -d
```

In this configuration using the default OVERRIDING=false in the `.env.\<GUARDIAN_ENV>.guardian.system` grants that the environments that are in each `./<service_name>/configs` remain unloaded.
