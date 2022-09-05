# How to create Operator ID and Operator Key

Following are the steps to follow to create Operator ID and Operator Key:

1. We need to create an account in Hedera Testnet Portal : [https://portal.hedera.com/login](https://portal.hedera.com/login)

<figure><img src="../../.gitbook/assets/Hedera Workflow - Step 2.jpeg" alt=""><figcaption><p>Login Screen</p></figcaption></figure>

If not logged in, we need to Sign Up as shown below:

<figure><img src="../../.gitbook/assets/Hedera Workflow - Step 3.jpeg" alt=""><figcaption></figcaption></figure>

2\. Once logged in successfully, we will get account ID, Private Key and Public Key of Hedera Testnet.

<figure><img src="../../.gitbook/assets/Hedera Workflow - Step 6.jpeg" alt=""><figcaption></figcaption></figure>

{% hint style="info" %}
Note: By Default, Testnet network keys are displayed. we can change the network by selecting network from the dropdown.
{% endhint %}

<figure><img src="../../.gitbook/assets/Hedera Workflow - Step 7.jpeg" alt=""><figcaption></figcaption></figure>

3\. After selecting required network, copy accountId and privateKey and paste it as Operator ID and Operator Key respectively in `guardian-service/.env` or `guardian-service/.env/docker`.
