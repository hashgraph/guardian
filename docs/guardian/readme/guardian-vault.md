# 🔐 Guardian Vault

Guardian Vault is intended to provide supports in securely storing sensitive data such as api keys, secrets, wallets and private keys, etc. Instead of keeping keys and secrets in env files or database in plain format, Vault is designed to encrypt data and restrict access according to per service Access Policies and Roles.

Although Cloud infrastructures like Google, Azure and AWS offer secure Secret Manager Service to make the configuration very simple without the burden of deployment process, there are on-premise native technologies such as Hashicorp Vault that provide Cloud Agnostic solutions. Currently, Guardian supports **AWS Secrets Manager** and **Hashicorp Vault** as its core secrets manager.

<figure><img src="../../.gitbook/assets/image (2) (9).png" alt=""><figcaption></figcaption></figure>

In the current Architecture, each service has permission to read/write/update secrets directly instead of handling operations through a central service like Auth Service. Secrets are considered as resources and categorized into different divisions and according to categories and subcategories Policies are created and consequently based on need-to-know basis principal roles per services with essential policies are generated in order that each service is assigned permissions that it requires to access the secrets. As an example, Auth Service does not need to know anything about the user wallets, but only requires access to auth secret key.

<figure><img src="../../.gitbook/assets/image (1) (10).png" alt=""><figcaption></figcaption></figure>

As expected in production all connections between vault and services are secured by TLS communication. Communication with AWS Secrets Manager is handled within a private network.

### Software Architecture

Secret Manager module is designed to handle interactions with Secret Manager infrastructures. Adapter classes are prepared in the lowest level to provide interfaces to each Secret Manager Infra, and the high level SecretManager class instantiates the right adapter according to configurations, and Hashicorp vault by default. Configuration to select the infrastructure is handled in the .env file located in the root directory of the guardian by the SECRET\_MANAGER variable. In case of AWS, another variable, AWS\_REGION must be also set as a common variable that will be populated to all services through a docker-compose file. Additionally, while selecting AWS as secret manager, the Vault docker container is not required to be deployed, for this reason the docker-compose files are separated. On top of the Secret Manager module, Wallet module is located to specifically store private keys using the Secret manager adapter. Wallet Manager stores private keys in wallet/{wallet\_id} path in which wallet\_id is the hash value of concatenation of token, type and key parameters. As storing secrets and keys to the database is highly insecure, the database vault is removed. On the other hand by providing direct access to secret managers by services, the channel to request read and write to the vault is deleted.

### Hashicorp Vault

Several scripts and config files are provided to smoothly start and configure Hashicorp Vault instance. Here are the steps to run Vault instance:

1. **Generate Certificates**: Hashicorp Vault in production requires tls communication that consequently valid tls keys and certificates must be provided for vault server and clients. In case of running vault by self-signed certificates, the `keygen_cfssl.sh` script under `hashicorp/scripts/keygen` is provided to automatically initially generate CA, Intermediate CA entities and derive server and client entities from Intermediate CA. The script uses CFSSL library to generate PKIs. CFSSL needs a global configurations and entities' profiles to generate certificates. All sample configurations are stored at `hashicorp/configs/cfss`. All generated tls files are stored in central directory which is `hashicorp/certs` by default. In order to run the script simply run `make vault_keygen` in guardian root directory in order that Makefile runs the neccessary commands.
2. **Distribute PKIs**: Having generated all keys and certificates, they must be copied to each service directory in order to be consumed for communicating with Vault. For this purpose `keystore` script is created to manage tls files. by passing `distribute` option to the script it automatically copies all tls files between services. Alternatively, run `make distribute_keys` will apply the same command by Makefile.
3. **Generate Vault Configuration**: In order to start Vault instance a config is required to configure vault instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized vault config file, the `vault_config_gen.sh` script is created in `hashicorp/scripts/vault` directory.
4. **Generate Consul Configuration**: Vault instance is intended to use Hashicorp COnsul as its backend. In order to start Consul instance a config is required to configure consul instance. The configurations can be customized by applying changes to variables in .env file in `hashicorp/.env` file. To generate a customized consul config file, the `consul_config_gen.sh` script is created in `hashicorp/scripts/consul` directory.

{% hint style="info" %}
_Note_: In order to generate vault and consul config files, the simplest way is to run `make cfgen` in the root directory of guardian.
{% endhint %}

5. **Clone Guardian Environment Variables**: Template .env and .env.docker files are provided a each service directory that must be cloned first in order to run the application. for this purpose simply run `make guardian_make_env` command in the root directory of guardian.
6. **Make Vault Up**: In order to start Vault instance backed by Consul in docker containers, the vault and consul services must be started by `docker-compose.yaml`. For this purpose simply run `docker-compose up -d consul vault` command.
7. **Initialize Vault**: Having started Vault instance, it must be initialized and configured.The `vault_init.sh` script in `hashicorp/scripts/vault` directory is developed to execute following steps:

{% hint style="info" %}
_Note_: In order to start and configure Vault it can be simply done by running `make vault_up` command in the root directory of guardian.
{% endhint %}

* **Initialize Vault**: Initializes vault operator and generates root token and unsealing keys. Root token can be used further for administration of vault. Unsealing keys must be used to unseal vault. Vault requires `secret-shares` and `secret-threshold` to generate unseal keys. `secret-shares` is the number of keys generated and `secret-threshold` is the number of keys must be used to unseal vault. These parameters are configured by `VAULT_UNSEAL_SECRET_SHARES` and `VAULT_UNSEAL_SECRET_THRESHOLD` variables inside .env file. root token and unsealing keys are stored in `hashicorp/vault/.root` file and must be removed after being generated.
* **Unseal Vault**: Having initialized the vault instance, it is still sealed and must be sealed by `secret-threshold` number of unsealing keys. The script automatically unseals the vault instance by running unseal command.
* **Enable KV V2 Secret Engine**:
* **Enable AppRole Auth Method**: Approle is an auth method for authentication of machines or apps with defined roles. Roles are defined by a set of policies which narrows the accessibility of roles to vault resources. Approle is consisting a set of workflows that provides `role_id` and `secret_id` as credentials (very similar to username and password) that must be used in authentication process to generate auth token that is authorized according to the role that is defined for the role\_id.
* **Create Policies for All guardian Service**: Each service like guardian-service has a specific access and permission to the vault resources. As an example guardian-service has access to wallets and operator key, while auth-service has access to auth secret key only. The access permissions must be defined by policies and attached to the roles that will be created for each service afterwards. A number of policy files are created and stored in the `hashicorp/configs/vault/policies`. The script will automatically retrieve policy files from the directory and create policies accordingly.
* **Create roles associated with policies for all services**: Having created a set of policies, roles with necessary policies must be created. An approle config file that implies each role and its policies is created and stored in `hashicorp/configs/vault/approle`. The script retrieves the `approle.json` file and creates roles with specified policies.
* **Get AppRole Credentials for all services**: Each service has a role with a set of specific policies, needs approle credentials to acquire auth token to access secrets. The credentials are fetched from vault for each role and immediately written to .env and .env.docker files. The env file paths are configured by `approle.json` file.
* **Push secrets for all services to Vault**: The initial secrets such as IPFS\_API\_KEY, AUTH\_SECRET\_KEY, OPERATOR\_KEY is stored to vault secret manager. A template secret file is created in `hashicorp/configs/secrets` that must be coned and customized into `secret.json` file. The script in the last step will push all secrets into their specified secret path.

### AWS Secrets Manager

AWS Secrets Manager provides a secure secret manager service with lots of flexibilities that lower the burden of deploying Hashicorp Vault instance as secret manager. AWS secrets manager does not require any credentials in order to authenticate as they are accessible withing a vps network by an EC2 instance or lambda function in the same region of secrets manager. However, the EC2 instance is required to acquire permissions to access the secret resources. Permissions are defined by roles consisting a set of policies, each define a specific permission to an AWS resource.

Scripts are created to automatically execute the required steps to prepare AWS secrets manager to be utilized by guardian services.

{% hint style="info" %}
_Note_: Before running the scripts it is necessary to login into AWS service by aws cli. Bsides all AWS commands require account id, that must be configured by `AWS_ACCOUNT_ID` in .env file.
{% endhint %}

1. **Create Roles and Policies**: `aws_iam_init.sh` script in `aws/scripts` directory initiates a role with a specific name configured by `GUARDIAN_SECRETS_ROLE_NAME` in .env file, creates policies that are stored in `aws/configs/policies` path and attach the policy to the role.
2. **Push Secrets**: The initial secrets such as IPFS\_API\_KEY, AUTH\_SECRET\_KEY, OPERATOR\_KEY is stored to vault secret manager. A template secret file is created in `aws/configs/secrets` that must be coned and customized into `secret.json` file. The `push_secrets.sh` script in `aws/secripts` folder will push all secrets into their specified secret path.
