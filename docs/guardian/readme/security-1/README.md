---
description: >-
  This doc presents the step-by-step of  how to configure the Guardian
  application to allow authentication via the Meeco Wallet
---

# 🔑 Meeco authentication

At the end of this doc, this is what suppose to see in the Guardian app.

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 20.23.36.png" alt=""><figcaption></figcaption></figure>

### Meeco credentials

Be sure to configure your Meeco credentials in `configs/.env.develop.guardian.system`

```
MEECO_AUTH_PROVIDER_ACTIVE=1
MEECO_BASE_URL=https://api-sandbox.svx.exchange
MEECO_OAUTH_URL="https://login-sandbox.securevalueexchange.com/oauth2/token"
MEECO_OAUTH_CLIENT_ID=571*********************e6a
MEECO_OAUTH_SECRET_ID=ONO@*****************rnNxpNt
MEECO_OAUTH_SCOPE=openid
MEECO_OAUTH_GRANT_TYPE=client_credentials
MEECO_ORGANIZATION_ID="09f7115e***********be032d6ca149"
MEECO_PASSPHRASE=7MHHMTJQQ******************7TPBH2P71XKDH1ZPF
MEECO_ISSUER_ORGANIZATION_ID="did:web:did-web.securevalue.exchange:343b08f3-***********-3f2d8a146a0d"
MEECO_ISSUER_ORGANIZATION_NAME=
MEECO_PRESENTATION_DEFINITION_ID="832e996c-**********-9d170fa381a8"
```

You might find the values in the portal [https://portal.securevalueexchange.com/](https://portal.securevalueexchange.com/)

### Where to find these credentials?

The very first thing is to activate the use of Meeco provider

```
MEECO_AUTH_PROVIDER_ACTIVE=1
```

For the `MEECO_OAUTH_CLIENT_ID` and MEECO\_OAUTH\_SECRET\_ID check the page below:

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 20.44.38.png" alt=""><figcaption></figcaption></figure>

For the variables: `MEECO_OAUTH_SCOPE=openid` and `MEECO_OAUTH_GRANT_TYPE=client_credentials` keep it as it is.

The MEECO\_ORGANIZATION\_ID variable value can be found here

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 20.49.20.png" alt=""><figcaption><p>Account settings</p></figcaption></figure>

The `MEECO_ISSUER_ORGANIZATION_ID` and `MEECO_ISSUER_ORGANIZATION_NAME` value are found on the page below

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 20.53.58.png" alt=""><figcaption></figcaption></figure>

Finally, the `MEECO_PRESENTATION_DEFINITION_ID` value is found here

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 20.59.02.png" alt=""><figcaption></figcaption></figure>

Once the env variables are defined you have to turn it on on the frontend. Set true the attribute **`isMeecoConfigured`** on the folder`frontend/src/environments/environment.ts`

<figure><img src="../../../.gitbook/assets/Screenshot 2023-08-02 at 19.43.11.png" alt=""><figcaption></figcaption></figure>

Note that there are at least three different environment files: `environment.prod.ts`, `environment.demo.ts` (e.g) change them according to your configurations.

Be sure to run the `docker-compose up --build` (e.g) command again to have it done.\\

So, enjoy your new authentication mechanism.
