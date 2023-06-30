# 🔨 How to Configure Hedera Local Node

1. Install a Hedera Local Network following the [official documentation](https://github.com/hashgraph/hedera-local-node#docker)
2. Configure Guardian's configuration files `.env/.env.docker` accordingly:

```
OPERATOR_ID=""
OPERATOR_KEY=""
LOCALNODE_ADDRESS="11.11.11.11"
LOCALNODE_PROTOCOL="http"
HEDERA_NET="localnode"
```

{% hint style="info" %}
Note:

1. Set **LOCALNODE\_ADDRESS** to the IP address of your local node instance. The value above is given as example.
2. Set **HEDERA\_NET** to **localnode**. If not specified, the default value is **testnet.**
3. Configure **OPERATOR\_ID** _and_ **OPERATOR\_KEY** accordingly with your local node configuration.
4. Remove **INITIALISATION\_TOPIC\_ID** as the topic will be created automatically.
5. Set **LOCALNODE\_PROTOCOL** to **http** or **https** accordingly with your local node configuration (It uses HTTP by default).
{% endhint %}

1. OPERATOR\_ID: The ID of the operation
2. OPERATOR\_Key: Private key of the operator\_
3. LOCALNODE\_ADDRESS : The address of the localnode server. This can be its IP address or a domain name
4. LOCALNODE\_PROTOCOL : Communication protocol for interactions with the local node, can be http or https.
5. HEDERA\_NET : Type of the Hedera node to transact.
