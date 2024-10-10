# Fireblocks signing in Guardian UI

## Operations remotely signed by the keys in Fireblocks

1. **submitMessage**

All messages sent to Hedera are signed with the Fireblocks keys using [Raw Signing](https://developers.fireblocks.com/docs/raw-message-signing-overview) method.

## &#x20;Operations signed by Operator ID/Key

OPERATOR\_KEY is used for generating DIDs and signing documents as Fireblocks API does not support such operations.&#x20;

Additionally OPERATOR\_KEY is used for the following operations:

•  newToken

•  newTopic

{% hint style="info" %}
**Note:** creation of new topics and/or tokens require freeze/wipe keys as a parameter in the API call. Guardian uses OPERATOR\_KEY.
{% endhint %}

•  wipe

•  grantKyc

•  revokeKyc

•  associate

•  dissociate

•  freeze

•  unfreeze

•  updateToken

•  deleteToken

{% hint style="info" %}
**Note**: Similarly to the creation of topics/tokens, Hedera SDK API require explicit specification of keys as a parameter.
{% endhint %}

•  transfer

•  transferNFT

•  newAccount

•  newTreasury

{% hint style="info" %}
**Note**: These operations require specific transaction type not supported by RAW SIGNING.
{% endhint %}

•  balance

{% hint style="info" %}
**Note**: Guardian uses the account specified in the UI
{% endhint %}

## Enabling Fireblocks Remote Signing:

When creating a user, select the “**Use fireblocks signing**” option and populate the following fields with values from your Fireblocks account configuration:

* Fireblocks Vault ID
* Fireblocks Asset ID
* Fireblocks API Key
* Fireblocks Private Key

![](<../../../.gitbook/assets/0 (1).png>)

Users, which have been created with this option enabled to remotely sign their Hedera transactions using Fireblocks API instead of via the built-in Guardian signing workflow.
