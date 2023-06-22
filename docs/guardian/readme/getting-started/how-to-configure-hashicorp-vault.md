# 🔨 How to Configure HashiCorp Vault

1. Configure .env/.env.docker files in **auth-service** folder

<pre><code><strong>VAULT_PROVIDER = "hashicorp"
</strong></code></pre>

{% hint style="info" %}
**Note**: VAULT\_PROVIDER can be set to "database" or "hashicorp" to select Database instance or a hashicorp vault instance correspondingly.
{% endhint %}

If the VAULT\_PROVIDER value is set to "hashicorp" the following 3 parameters should be configured in **auth-service** folder.

1. HASHICORP\_ADDRESS : http://localhost:8200 for using local vault. For remote vault, we need to use the value from the configuration settings of Hashicorp vault service.
2. HASHICORP\_TOKEN : the token from the Hashicorp vault.
3. HASHICORP\_WORKSPACE : this is only needed when we are using cloud vault for Hashicorp. Default value is "admin".

2\. Hashicorp should be configured with the created Key-Value storage, named "secret" by default, with the settingKey=\<value> records for the following keys:

1. OPERATOR\_ID
2. OPERATOR\_KEY
3. IPFS\_STORAGE\_API\_KEY

{% hint style="info" %}
**Note:** These records in vault will be created automatically if there are environment variables with the matching names.
{% endhint %}

#### How to import existing user keys from DB into the vault:

During Guardian services initialization, we need to set the following configuration settings in **auth-service** folder:

```
IMPORT_KEYS_FROM_DB = 1
VAULT_PROVIDER = "hashicorp"
```
