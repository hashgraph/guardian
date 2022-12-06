# 🔨 How to Change Explorer URL

To make changes in the Explorer, we need to change some parameters in environment settings on UI. explorerSettings, which contains url (with network, type, value variables) , networkMap, typeMap (networkMap and typeMap helps to resolve api path on different explorers) as shown:

<figure><img src="../../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

As we see the above demonstrates setting of Ledger Works explorer.

{% hint style="info" %}
**Note: By default, we use Ledger Works explorer.**
{% endhint %}

#### To switch from Ledger Works to Dragon Glass we need to make following changes:

1. Change the url to [https://${network}.dragonglass.me/hedera/${type}/${value}](https://${network}.dragonglass.me/hedera/$%7Btype%7D/$%7Bvalue%7D)
2. Change networkMap mainnet to app

<figure><img src="../../../.gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>
