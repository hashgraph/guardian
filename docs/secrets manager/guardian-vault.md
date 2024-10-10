# Guardian Vault

Guardian Vault is intended to provide supports in securely storing sensitive data such as api keys, secrets, wallets and private keys, etc. Instead of keeping keys and secrets in env files or database in plain format, Vault is designed to encrypt data and restrict access according to per service Access Policies and Roles.

Although Cloud infrastructures like Google, Azure and AWS offer secure Secret Manager Service to make the configuration very simple without the burden of deployment process, there are on-premise native technologies such as Hashicorp Vault that provide Cloud Agnostic solutions. Currently, Guardian supports __AWS Secrets Manager__ and __Hashicorp Vault__ as its core secrets manager.

<img src="../.gitbook/assets/Secrets Manager Architecture.jpg">

In the current Architecture, each service has permission to read/write/update secrets directly instead of handling operations through a central service like Auth Service. Secrets are considered as resources and categorized into different divisions and according to categories and subcategories Policies are created and consequently based on need-to-know basis principal roles per services with essential policies are generated in order that each service is assigned permissions that it requires to access the secrets. As an example, Auth Service does not need to know anything about the user wallets, but only requires access to auth secret key.

<img src="../.gitbook/assets/Vault Resource Policy.jpg">

As expected in production all connections between vault and services are secured by TLS communication. Communication with AWS Secrets Manager is handled within a private network.

## Software Architecture
Secret Manager module is  designed to handle interactions with Secret Manager infrastructures. Adapter classes are prepared in the lowest level to provide interfaces to each Secret Manager Infra, and the high level SecretManager class instantiates the right adapter according to configurations, and Hashicorp vault by default. Configuration to select the infrastructure is handled in the .env file located in the root directory of the guardian by the SECRET_MANAGER variable. In case of AWS, another variable, AWS_REGION must be also set as a common variable that will be populated to all services through a docker-compose file. Additionally, while selecting AWS as secret manager, the Vault docker container is not required to be deployed, for this reason the docker-compose files are separated.
On top of the Secret Manager module, Wallet module is located to specifically store private keys using the Secret manager adapter. Wallet Manager stores private keys in wallet/{wallet_id} path in which wallet_id is the hash value of concatenation of token, type and key parameters.
As storing secrets and keys to the database is highly insecure, the database vault is removed. On the other hand by providing direct access to secret managers by services, the channel to request read and write to the vault is deleted.

## Hashicorp Vault
Several scripts and config files are provided to smoothly start and configure Hashicorp Vault instance. Here are the steps to run Vault instance:

1. __Generate Certificates__: Hashicorp Vault in production requires tls communication that consequently valid tls keys and certificates must be provided for vault server and clients. In case of running vault by self-signed certificates, the `keygen_cfssl.sh` script under `hashicorp/scripts/keygen` is provided to automatically initially generate CA, Intermediate CA entities and derive server and client entities from Intermediate CA. The script uses CFSSL library to generate PKIs. CFSSL needs a global configurations and entities' profiles to generate certificates. All smaple configurations are stored at `hashicorp/configs/cfss`. All generated tls files are stored in central directory which is `hashicorp/certs` by default. In order to run the script simply run `make vault_keygen` in guardian root directory in order that Makefile runs the neccessary commands.

2. __Distribute PKIs__: Having generated all keys and certificates, they must be copied to each service directory in order to be consumed for communicating with Vault. For this purpose `keystore` script is created to manage tls files. by passing `distribute` option to the script it automatically copies all tls files between services. Alternatively, run `make distribute_keys` will apply the same command by Makefile.

3. __Generate Vault Configuration__: In order to start Vault instance a config is required to configure vault instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized vault config file, the `vault_config_gen.sh` script is created in `hashicorp/scripts/vault` directory.

4. __Generate Consul Configuration__: Vault instance is intended to use Hashicorp COnsul as its backend. In order to start Consul instance a config is required to configure consul instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized consul config file, the `consul_config_gen.sh` script is created in `hashicorp/scripts/consul` directory.

_Note_: In order to generate vault and consul config files, the simplest way is to run `make cfgen` in the root directory of guardian.

5. __Clone Guardian Environment Variables__: Template .env and .env.docker files are provided a each service directory that must be cloned first in order to run the application. for this purpose simply run `make guardian_make_env` command in the root directory of guardian.

6. __Make Vault Up__: In order to start Vault instance backed by Consul in docker containers, the vault and consul services must be started by `docker-compose.yaml`. For this purpose simply run `docker-compose up -d consul vault` command.

7. __Initialize Vault__: Having started Vault instance, it must be initialized and configured.The `vault_init.sh` script in `hashicorp/scripts/vault` directory is developed to execute following steps:

_Note_: In order to start and configure Vault it can be simply done by running `make vault_up` command in the roo directory of guardian.

- __Initialize Vault__: Initializes vault operator and generates root token and unsealing keys. Root token can be used further for adminstration of vault. Unsealing keys must be used to unseal vault. Vault requires `secret-shares` and `secret-threshold` to generate unseal keys. `secret-shares` is the number of keys genrated and `secret-threshold` is the number of keys must be used to unseal vault. These parameters are configured by `VAULT_UNSEAL_SECRET_SHARES` and `VAULT_UNSEAL_SECRET_THRESHOLD` variables inside .env file. root token and unsealing keys are stored in `hashicorp/vault/.root` file and must be removed after being generated.

- __Unseal Vault__: Having initialized the vault insance, it is still sealed and must be sealed by `secret-threshold` number of unsealing keys. The script automatically unseals the vault instance by running unseal command.

- __Enable KV V2 Secret Engine__: 

- __Enable AppRole Auth Method__: Approle is an auth method for authentication of machines or apps with defined roles. Roles are defined by a set of policies which narrows the accessibility of roles to vault resources. Approle is consisting a set of workflows that provides `role_id` and `secret_id` as credentials (very similiar to username and password) that must be used in authentication process to generate auth token that is authorized according to the role that is defined for the role_id.

- __Create Policies for All guardian Service__: Each service like guardian-service has a specific access and permission to the vault resources. As an example guardian-service has access to wallets and operator key, while auth-service has access to auth secret key only. The access permissions must be defined by policies and attached to the roles that will be created for each service aftewards. A number of policy files are created and stored in the `hashicorp/configs/vault/policies`. The script will automatically retrieve policy files from the directory and create policies accordingly.

- __Create roles associated with policies for all services__: Having created a set of policies, roles with neccessary policies must be created. An approle config file that implies each role and its policies is created and stored in `hashicorp/configs/vault/approle`. The script retrieves the `approle.json` file and creates roles with specified policies.

- __Get AppRole Credentials for all services__: Each service has a role with a set of specific policies, needs approle credentials to acquire auth token to access secrets. The credentials are fetched from vault for each role and immediately written to .env and .env.docker files. The env file paths are configured by `approle.json` file.

- __Push secrets for all services to Vault__: The initial secrets such as IPFS_API_KEY, AUTH_SECRET_KEY, OPERATOR_KEY is stored to vault secret manager. A template secret file is created in `hashicorp/configs/secrets` that must be coned and customized into `secret.json` file. The script in the last step will push all secrets into their specified secret path.



## AWS Secrets Manager

AWS Secrets Manager provides a secure secret manager service with lots of flexibilites that lower the burden of deploying Hashicorp Vault instance as secret manager. AWS secrets manager does not require any credentials in order to authenticate as they are accissible withing a vps network by an EC2 instance or lambda function in the same region of secrets manager. However, the EC2 instance is required to acquire permissions to access the secret resources. Permissions are defined by roles consisting a set of policies, each define a specific permission to an AWS resource.

Scripts are created to automatically execute the required steps to prepare AWS secrets manager to be utilized by guardian services.

_Note_: Before running the scripts it is necessary to login into AWS service by aws cli. Bsides all AWS commands require account id, that must be configured by `AWS_ACCOUNT_ID` in .env file.

1. __Create Roles and Policies__: `aws_iam_init.sh` script in `aws/scripts` directory initiates a role with a specific name configured by `GUARDIAN_SECRETS_ROLE_NAME` in .env file, creates policies that are stored in `aws/configs/policies` path and attach the policy to the role.

2. __Push Secrets__: The initial secrets such as IPFS_API_KEY, AUTH_SECRET_KEY, OPERATOR_KEY is stored to vault secret manager. A template secret file is created in `aws/configs/secrets` that must be coned and customized into `secret.json` file. The `push_secrets.sh` script in `aws/secripts` folder will push all secrets into their specified secret path.


## Azure Key Vault

Azure Vault provides a centralised service to manage sensitive data safe and secure. It provides three services to manage Secrets, Keys and Certificates:

* Secrets Manager: Azure Key Vault enables secure storage of secrets such as Passwordds, API Keys, etc. Secrets can be easily managed, rotated, and accessed programmatically.

* Key Manager: Cryptographic keys can be generated and managed within Azure Key Vault. These keys can be used for encryption, decryption, signing, and verification purposes. Azure Key Vault supports a variety of key types and algorithms.

* Certificate Manager: Azure Key Vault allows you to store and manage SSL/TLS certificates. You can import certificates or generate new ones within the Key Vault. Key Vault can also automate the renewal and deployment of certificates.

Guardian is supporting Azure Vault Secrets Manager to handle securely the secrets, keys and wallets. At the moment Default Azure Credential is used for authenticating to Azure Key Vault that requires following steps to enable any machine to access Secrets:

1. __Create a Key Vault__: From the Azure Portal navigate to __Key Vaults__, choose a Resource Group has been created before from the list, insert a name for the Vault instance, select the region and carefully prepare other configurations and follow to the Next page.

2. Choose __Vault Access Policy__ as Permission model and __Azure Virtual Machines for deployment__ as Resource Access. Under Access Policies, click on __Create__ and in the prompt window choose all neccessary permissions required to grant to a User. For Guardian at least __Get__ and __Set__ of __Secrets__ are required. Next find the registered User to grant access. In the last step choose a registered application if has been created in Azure Active Directory before; otherwise select Next and finalize the process.

3. Configure Networking, Add Tags and create the Vault.

4. Now in the directory of auth-service, guardian-service, policy-service and worker-service set __AZURE_VAULT_NAME__ environment variable by the name chosen as Vault previously.

## GCP Secrets Manager

Google Cloud Platform (GCP) Secrets Manager is a managed service that helps you securely store and manage secrets, such as API keys, database credentials, and other sensitive information. It provides a central repository for storing secrets, with built-in security features and integration with other GCP services. It enables secure storage of secrets, secrets versioning and rotation, integration with other Google Cloud services like Cloud Run, VMs, App Engine, etc, supports Access Control, so on.

Guardian is now suport GCP Secrets Manager to store its secrets. In order to access Gcp Secrets Manager it is required to set the identifier of the project created in google cloud platfer that the GCP Secrets Mnager is supposed to be resided, as  __GCP_PROJECT_ID__ in the .env file in the configs of auth service.

Here is the steps to create secrets manager in google cloud platform. It is assumed that the project has been created in prior.

1. From Google Cloud Platform, navigate to underlying project

2. From the Navigation Menu, select Security and then click on Secret Manager

3. In the Secret Manager page, click on Create Secret

4. Configure Secret manager by adding Name, Replication policy, Rotation, Expiration, etc according to security policies and click on Create Secret button

__*NOTE*__ According to the tests of read/write operations of secrets to the GCP Secrets manager, each secret R/W operation take around 1 second which is too slow to be used constantly in the Guardian Application. The reason is, Guardian generates lots of wallets and requires tp retrieve them from the Vault in order to sign transactions. The late response from GCP leads to make Guardian functioning too slowly. Consequently, it is not recommended to use GCP for constant R/W of secrets.