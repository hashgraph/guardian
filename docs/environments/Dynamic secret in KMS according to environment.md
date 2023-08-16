
## Dynamic Vault/KMS path configuration according to the environment
##### guardian #1695  


Guardian platform manage to segregate secret data basing on the variables defined in the ecosystem environment. As in the database case the two variables leveraged to discriminate secret storage are the GUARDIAN_ENV and HEDERA_NET variables. 

Each KMS use slight different approach to naming conventiion of holded secret. the KMS have to be configured  with this two dimension(GUARDIAN_ENV and HEDERA_NET) and insert them in the secret name, in the Roles name and in the Policies that define the access rules to that secret.

Guardian has adopted a specialized adapter to interact with secret managers. To implement the data separation each specialized adapter instance adds a two dimensional prefix GUARDIAN_ENV and HEDERA_NET to the PATH or NAME that identify the secret. So the adapter is aware of the MultiEnvironment. 

The SECRET_MANAGER variable has to be configured in the system environemnt to grant the general secret manager class to work properly by the means of the right adapter in the way that is described at docs/secrets manager/guardian-vault.md

*Set SECRET_MANAGER as empty when not using any Secret Manager*

    SECRET_MANAGER="" 

SECRET_MANAGER can assume the following values:  ['hcp', 'aws', 'azure']

On the other hand the following variables have been mantained for compliance backward reason, and possible developed guardian extensions, but are not used for the Guardian Secret Manager implementation.

    VAULT_PROVIDER="database"               #Always set to "database"
    HASHICORP_TOKEN="1234"                  #just written in NodeVault.VaultOptions never used
    HASHICORP_ADDRESS="http://vault:8200"   #just written in NodeVault.VaultOptions never used
    HASHICORP_NAMESPACE="admin"             #just written in NodeVault.VaultOptions never used
    #HASHICORP_UNSEAL_KEY=""                #unused at the moment

In a special way, if you are not sure of the result, leave unchanged the value of this variables and in a special way *leave the VAULT_PROVIDER variable set to "database"* and use only the SECRET_MANAGER variable to configure the "hcp" option this will avoid mixing the usage of this two different set of variables with unpredictable result.

## HASHICORP VAULT

The script described in [secret manager](https://github.com/hashgraph/guardian/blob/main/docs/secrets%20manager/guardian-vault.md) have been updated to provides the secrets for the different Ecosystem Environment and push them in the right file per each of the services while providing the configuration of ROLE and POLICIES calling the Vault API in the server depending to the environment.

Hashicorp Vault manage the TLS communication between each of the services as client and the Hashicorp Vault server as detailed in the docs/secrets manager/guardian-vault.md

The R/W secrets permission Keys are added to the right environment file depending on the GUARDIAN_ENV variable. For this reason the guardian /vault/hashicorp/.env.template file has been enriched with the two variables GUARDIAN_ENV and HEDERA_NET. Then, as it is described at docs/secrets manager/guardian-vault.md, before the execution of the script, cut and paste the  /vault/hashicorp/.env.template to create a /vault/hashicorp/.env file and configure the variables in it as of your needs.

The following environment variables has been introduced in the ecosystem environemnt to grant the Hashicorp Vault to work properly. 

    SECRET_MANAGER="hcp" added in the ecosystem environment variable
    VAULT_API_VERSION=v1
    VAULT_ADDRESS=https://vault:8200
    VAULT_CA_CERT=tls/vault/client/ca.crt
    VAULT_CLIENT_CERT=tls/vault/client/tls.crt
    VAULT_CLIENT_KEY=tls/vault/client/tls.key

About the steps provided at docs/secrets manager/guardian-vault.md

The execution of the steps described allow the easy execution of every single services in the same node by his own by the means of PM2. 
In this case the only environment files used are the ones present in each of the guardian services at \<service\>/configs/.env.\<GUARDIAN_ENV\>.\<service_name\>  (this execution need to mind the common environment variables configuring them manually for each of the service).

When executing by the means of an orchestrator (as docker compose) the environment files used are the Ecosystem environment starting by the ones at path ./configs/.env.\<GUARDIAN_ENV\>.guardian.system (containing the common variables) continuing with the integration of single service level variables as usual. 

In this latter case the steps described for [hashicorp](https://github.com/hashgraph/guardian/blob/main/docs/secrets%20manager/guardian-vault.md#hashicorp-vault) are changed as follows:

- **Steps from 1 to 4** will be executed as specified.

- **Step 5** is not needed any more: jump step 5.

- **Step 6** bring vault and consul up. Step 6 is breaked down in the following two steps:
    1. Only for first guardian installation: the guardian_default docker Network need to exist before Vault server Use it, in guardian folder execute: 

        >$ docker network create guardian_default
    
        If Guardian is already installed take care of stop the execution of all containers

    2. A docker-compose.yaml file is placed in the ./vault/hashicorp folder to bootstrap the two server Vault and Consul directly, Change directory to./vault/hasicorp and execute 

        >$ docker compose up -d consul vault

    The two cointainers are going to run referencing the guardian_default network as all other guradian services.

- **Step 7** When the two services are running execute the script ./vault/hashicorp/scripts/vault/vault_init.sh from the guardian folder (or the vault_init_mac.init in apple platforms).

    This script updates the two following variables with the secret token provided by the vault server to authenticate with the right role.

        VAULT_APPROLE_ROLE_ID= 
        VAULT_APPROLE_SECRET_ID=

    if not present the variables are inserted only in the 4 services: auth-service, guardian-ervice, policy-service, and worker-service. Their value are populated in the ./\<service\>/configs/.env.\<GUARDIAN_ENV\>.\<SERVICE NAME\> files by the script basing on the previously defined GUARDIAN_ENV variable.

    The same script create a set of files in folder ./vault/hashicorp/configs/vault/secrets/tokens/<service_name>/.env.secrets this files are kept to allow configuration of other environment

- **Step 8** start Guardian as usual

For Hashicorpp Vault the secret multienvironment naming convetion defined in the Vault by the execution of the script is going to be:

    <GUARDIAN_ENV> / <HEDERA_NET> / <PATH_TO_SECRET>

The script executed at stop 7 produce two kind of policies to manage the case when varialbe <GUARDIAN_ENV>  is empty.

	Policy1: <HEDERA_NET> / <PATH_TO_SECRET>                                       
	Policy2: <GUARDIAN_ENV> / <HEDERA_NET> / <PATH_TO_SECRET>

- **Adding other new environment :**
After the first execution of the 8 steps every of the services is configured as Application with the Role needed to access the secrets following the policies configured. 
To add other environment you need to create new secrets in the Vault per every of the environemt and configure the two variables in every of the right environmet in the ./<service_name>/configs/.env.<service_name>.<GUARDIAN_ENV>.

        VAULT_APPROLE_ROLE_ID= 
        VAULT_APPROLE_SECRET_ID=

    To execute this actions automatically configure the GUARDIAN_ENV variable at folder ./vault/hashicorp/.env with the new environment name and run the provided script: ./vault/hashicorp/scripts/vault/vault_new_env.sh. The script configure the environemnt file of every of the four service and push the new secrets to the vault server.
    Now you can stop and start the guardian application: configure the new ecosystem environment per all its files and restart the application.

## AWS Secret Manager

Change in the ecosystem environment the SECRET_MANAGER variable to 
SECRET_MANAGER="aws"

For AWS Secret Manager one variable has been added to the system environemnt  templates files of Guardian.

    # AWS
    AWS_REGION=eu-central-1

The script provided by Guardian and described at  docs/secrets manager/guardian-vault.md  is able to configure the ROLE / POLICIES secret in a Multi-environment fashion inside the AWS Secret Manager. As in the preciding case, the script is based on the two new environment variables defined at ./vault/aws/.env.template GUARDIAN_ENV and HEDERA_NET
The Policies that are defined in the scripts are compliant with the AWS security rules and the Action defined in the policies json files (folder:vault/aws/configs/policies) do not use wildcards but specified the following single actions: GetSecretValue, CreateSecret, ListSecrets.

In the case of AWS Secret Manager  the secret multienvironment naming convetion defined is

    <GUARDIAN_ENV> / <HEDERA_NET> / <PATH_TO_SECRET>


## AZURE KEY VAULT

Change the SECRET_MANAGER variable to "azure" in the ecosystem environment.
SECRET_MANAGER="azure" 

For Azure Key Vault one variable has been added to the system environemnt templates files of Guardian.

    # Azure Key Vault Configs
    AZURE_VAULT_NAME="<vault name>"

The secret multienvironment naming convetion defined is

    GuardianenvHederanetPathToSecret

Update the policy and secret following the steps described for [azure](https://github.com/hashgraph/guardian/blob/main/docs/secrets%20manager/guardian-vault.md#azure-key-vault).