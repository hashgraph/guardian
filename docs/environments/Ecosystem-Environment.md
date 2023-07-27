### Ecosystem Environments
###### \#1923, \#1639


The set of environmet parameters represent the context in which a service it is executed. Each service needs to know this context to adapt its behaviour to the real working condition. At the service level the node dotenv library allows to read environment of the kind \<key,value\> this library by default reads from .env file. The data are reads in a the process.environment data structure available in the execution context of Node process. 
A unique file define the environment and keeps the responsibility  to create the shared operative ecosystem.


 All Guardian Microservices share a common set of Environment variables. In this way Guardian can be seen as an ecosystem  with several services and common set of parameters leading his behaviour. This environment parameters  are shared between all the services of the Guardian ecosystem.
All variables are defined in a ".env.\<GUARDIAN_ENV\>.guardian.system" file. The file name is parametric so it is possible to define a different files for different possible running configuration, for example production, develop, test1. The ecosystem environment file follow the .env.template.guardian.system file that let write new configurations with the set of necessary variables. Both the template file and the resulting environmets files are in the folder "./configs/", they can be discriminated by its name to spread the session. 

The parameter GUARDIAN_ENV is defined univocally in a .env file. The containers orchestration will be responsible to push the environment in to the container in a way the environment will be available to the Node server. For example in the execution of Guardian using docker compose tool the tool inject the environment in each container. Docker compose push the environment in the container by the means of the env-file attribute and the environment attribute. Overmore the environment attribute can be parametrized by variables defined in a ".env" file located next to the docker_compose.yaml.

![hierarchy.png](https://images.zenhubusercontent.com/63dbe2bd4d4d6290bed6780c/12790cd6-19b5-4f3c-aad2-9d28081e8498)

Also Guardian services are allowed to define specific service variables. This different set of variables allow to have a hierarchical definition of the same variable in a way that a developer could redefine some of them in a service specific way or add new variables extending the usage of the ecosystem environment.
The environment variables that are specific to services can be specified by the means  of .env.\<service name\>.\<GUARDIAN_ENV\> files in each service.


Per each installed service the environment is configured using the two file:
1) ".env" file
2) "./guardian/\<service name\>/configs/.env.\<service mane\>.develop" file

The environment is loaded in the service by the file config.ts. the Environment is read in to two steps: at first steps the service .env file is loaded by Node while at second step ".env.\<service name\>.\<GUARDIAN_ENV\>" file is loaded. 
A new environmet variable OVERRIDE as "true"/"false" it has been added to let variables defined in the ".env.\<service name\>.\<GUARDIAN_ENV\>.\<GUARDIAN_ENV\>" to override the common defined variables or add new ones. For example If OVERRIDE=true a variable with the same name as the one already defined in the ".env"" file will assume the value specify at service level. The OVERRIDE parameter is not mandatory. if OVERRIDE="false" (default value) specific service variables can only be added to the global ones. In each service a new "./configs" folder holds the set of paramentric service level environment files.

With this implementation the service orchestrator can push not just the econsystem environment but the service specific variables too or leave the service specific variables under the responsibility of the service itself.

For example it is possible to use docker compose to orchestrate the service in a single node. Dcoker compose has “env-file” and “environment” attributes to define environment. There is a precedence between this two attributes as define at https://docs.docker.com/compose/environment-variables/envvars-precedence/#simple-example.
In this way override=”true” always and variables re-assigned in the environment attributes override what has been defined in the .env.\<GUARDIAN_ENV\>.guardian.system env-file. 


EXAMPLES:
---------

Configure each service without an orchestrator
-----------------------------------------------

configure .env, in ./guardian/\<service name\>/.env. Insert the variable GUARDIAN_ENV and give it the name that you choose for you Guardian platform environment (production, develop ...). If you update a production environment to keep working with your previous data leave the field GUARDIAN_ENV="" empty.

The OVERRIDE variable is not mandatory and it default to "false".
```plaintext
GUARDIAN_ENV="develop"
# OVERRIDE="false"
```
   
Every variable that is used by the service is configured inside the .guardian/\<service name\>/configs folder. Because GUARDIAN_ENV is configured as "develop" each service confiiguration are stored in files with format "./guardian/\<service name\>/configs/.env.\<service mane\>.develop" that follows the template in the same folder. 

Configure the guardian-service
   in ./guardian/guardian-service/configs/.env.guardian.develop

```plaintext
OPERATOR_ID="..."
OPERATOR_KEY="..."
```

Configure the worker-service
   in ./guardian/worker-service/configs/.env.worker.develop
```plaintext
IPFS_TIMEOUT="720"
IPFS_PROVIDER="web3storage" # 'web3storage' or 'local'
#Single quote IPFS_PUBLIC_GATEWAY
IPFS_PUBLIC_GATEWAY='https://ipfs.io/ipfs/${cid}'
IPFS_STORAGE_API_KEY="..."
IPFS_NODE_ADDRESS="http://ipfs-node:5002"
```

## 1) Docker Compose Configuration
-----------------------------
the following configuration will ignore the guardian-service configuration for variables with same name using only the ecosystem configuration while will add the new specific guardian-service variables for newly defined variables like DB_HOST="localhost", DB_DATABASE="guardian_db" etc..

### At root level: 

- in ./guardian/.env

```plaintext
GUARDIAN_ENV="develop"
```
    
- in ./guardian/configs/.env.develop.guardian.system
```plaintext
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
    
### At guardian-service level:

in file ./guardian/guardian-service/configs/.env.guardian.develop

```plaintext
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

    

### RUN TIME RESULT

The following environment is loaded by the service. 

```plaintext
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
    


## 2) to mantain the same database already in use
---------------------------------------

### at root level:

in ./guardian/.env

```plaintext 
GUARDIAN_ENV=""
```

in ./guardian/configs/.env..guardian.system

```plaintext
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
    
    

### at guardian-service level:

    in ./guardian/guardian-service/configs/.env.guardian

```plaintext
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


### RUN TIME RESULT: 

at guardian service level the following environment is loaded at runtime

```plaintext
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
    

### 3) To use the docker-compose configuration and overriding specific service. 
--------------------------------

The docker compose file to be used for this alternative is docker-compose_SSV.yaml together with the .env_SSV in the ./configs folder. 
Using this configuration both the ecosystem common variables and the service specific variables will be configured in the root folder. using the .env file for specific services variables and the ./config/.env.\<GUARDIAN_ENV\>.guardian.system for ecosystem variables.

Follow the steps:

```plaintext
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

In this configuration using the default OVERRIDING=false in the .env.\<GUARDIAN_ENV\>.guardian.system grant that the environments that are in each ./\<service\>/configs remain unloaded.