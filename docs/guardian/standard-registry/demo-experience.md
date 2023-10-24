# 📹 Demo Experience

Guardian now includes a "Demo Experience" feature which separates the production and demo versions by default. In order to access either the production or demo version, the user will need to build and deploy Guardian, defining on the ‘.env’ file present in the root directory the variable ‘DEMO=true’ if the demo is desired or not stating it at all if the production mode is intended.

**It's important to note that if ‘DEMO’ is present with a value other than ‘DEMO=true’, the auth-service, api-gateway, guardian-service and web-proxy modules will still be built as if the demo is intended, so either use ‘DEMO=true’ or delete the variable altogether.**

## **Demo Mode**

**Procedure:**

**`./.env`**

```
/## DEMO ENVIRONMENT
# in case it is desired to build Guardian in "demo" mode, you will need to define DEMO=true
# if "production" mode is intended, delete this variable altogether
DEMO=true

```

When deploying in demo mode, the **demo accounts created on build will be included**. Additionally, when it comes to the API, the present **‘api/v1/demo’** endpoints will be accessible, leading to the availability of the **"Demo Admin Panel"**, and the **‘api/v1/accounts/register’ POST** **method can be used by anyone even when logged out, as before.** The header will make it evident that the user is using the demo as "Guardian" will have "Demo" written in superscript and the color of the header will turn grey instead of the default black.

<figure><img src="https://lh6.googleusercontent.com/VNAhalpYIBezXRQwOqf1moe-Svu7uaoX8KvZBs6NXM6BAsBh_v-I1wYZORIN72AzSdUWzzOmTHwqMofzjjIR9Qrv8xg4YtLrJw6c_YPz09BvTnReeg6c25mjVjA0YAnldAvUGEYXbc7peI1ny1vFRQg" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/r3RzkzT9QMAUXa2mLsdf3gW-dYYEQg4TmPC0j0oVeoZZYKzLrvE-yXZBPr07yPtV169AbzBZEIB5Z_6OJYT-b0BSyVJCo4v61Lymm3Q2Re7oiR2aAhfz3LyzFcsLNXT7Ghu7suOe_euykYuwXiMTcV0" alt=""><figcaption></figcaption></figure>

## **Production Mode**

**Procedure:**

**`./.env`**

```
## DEMO ENVIRONMENT
# in case it is desired to build Guardian in "demo" mode, you will need to define DEMO=true
# if "production" mode is intended, delete this variable altogether

```

When Guardian is built in production mode, the **demo accounts** that have been present until now will **no longer be produced on deployment, besides a single Standard Registry account.** The **‘api/v1/accounts/register’ POST method is now guarded to be used exclusively by logged in Standard Registries** while the **‘api/v1/demo/’** **methods are deactivated** as well. Finally, on the frontend side, the "Demo Admin Panel" will no longer be present.

<figure><img src="https://lh4.googleusercontent.com/gt_hWnTA_vnh3_PIRuFv_GLMV7DhxeDFFHY3Zks3IttxWqeGAo0Urzthb0Q7hqkIwMkXfO5H-XM_o5ocDeEhNqkPFeIrHoWq2qfWO7YjVsGh4lmHV80xdw8p5F2PXH-IohHbJiUyDd5-pa7INkTPIGk" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/BK37K83W4oQUutUkAoMXpLnSmDFPugYCfMLqN4YpUQDGsiddVrxhXxoqFtc3V70UtGrJmG3nNLyCMtAKC4U29CTAfLba2lq-GF5-3atcU2tci4SEvdDqt3sLHJk5wMk43ZkFhton7qTJNVN9PFTuAyA" alt=""><figcaption></figcaption></figure>

To summarize, the "Demo Experience" feature in Guardian allows for the separation of the production and demo versions. By defining the ‘DEMO’ variable in the ‘.env’ file, the user can access the desired version. In production mode, the demo accounts and related features will no longer be present, whereas in demo mode, they will be available and the header will indicate that the user is using the demo version.

## **Deploying with Docker Compose**

Much like what was already done for the ‘web-proxy’ service, now the ‘auth-service’, ‘api-gateway’ and ‘guardian-service’ services also contain separate Dockerfiles and tsconfig files for both demo and production modes. This allows further liberties when configuring each mode. For the already existing ‘web-proxy’ service, as we are now allowing the toggle of building with demo configurations, some of these can be found at the bottom of your .env.${GUARDIAN\_ENV}.guardian.system, such as:

`./guardian/configs/.env.${GUARDIAN_ENV}.guardian.system`

```
# DEMO CONFIGS - WEB PROXY
# --------------
GATEWAY_HOST="api-gateway"
GATEWAY_PORT="3002"
GATEWAY_CLIENT_MAX_BODY_SIZE="1024m"
MRV_SENDER_HOST="mrv-sender"
MRV_SENDER_PORT="3005"
TOPIC_VIEWER_HOST="topic-viewer"
TOPIC_VIEWER_PORT="3006"
API_DOCS_HOST="api-docs"
API_DOCS_PORT="3001"

```

In order to make use of the already existing demo configuration files, the intention was to make the deployment in either demo or production mode as seamless as possible, leading, unfortunately, to a compromise. Because ‘.yml’ files do not allow native logic operations and Docker Compose does not allow ‘if else’ operations, the ‘web-proxy’, ‘auth-service’, ‘api-gateway’ and ‘guardian-service’ services will build the demo versions every time the variable ‘DEMO’ is stated, even if it is equal to a random value or even ‘false’. As stated before, the rule of thumb is **if you want the demo, state ‘DEMO=true’, otherwise delete the variable all together from your root .env file.** The following diagrams summarize what has been said:

<figure><img src="https://lh4.googleusercontent.com/0FdtVx84ciGYNgeLrWbQDYn_r9Wol4lMJsrutXTuSEzY-NSv9mb8M_ppdzr1lbtB-vyblJ-Z1S3csBVX1UfRNJkDY8lHkXSS0Tg6UhAWu3nXhmjNf4fhcPG_H0VripvB5Kn7cZL2VrorVff2oly1v9E" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh6.googleusercontent.com/JYUGm_CUVLDdjbM8teH-oPHMUWHgQzMnd4GVaaoFe6OyvpwRa_-vJKTYwUHU3cWthWvJd8XObbnZzajCRVpNAih_KdwMe9nJ4n688_i28uxol5u4CyA-RCX9LUeVVXhDJqQwbHsd8U8n25jueXiYUyY" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh5.googleusercontent.com/NX_LJdLmoTTWJyJpQ2n0Yvxl_E341ZpfxsyANvCyJEsAJ5pAuDv4gv3C-MRMsRcDKzkoXVR30LwV_D9Si8kxrNEg_3qr0YwnfvdyIw4QlnpBesVxZuNUt0KMkc7Pjui9SwIjWGC2K5biyPyKv2lh9Tg" alt=""><figcaption></figcaption></figure>

## **New way of creating accounts (transversal to both Demo and Production modes)**

Up until now it was possible to generate new accounts on the “Create New Account” under the /**login** page, however, with these changes, this will only remain true if under a Demo build (DEMO=true defined on the \~/**.env**). This requires a new way for Standard Registries to be able to create new accounts. The /**accounts/register** POST method is still available on both versions, exclusively for Standard Registries if on Production mode (no DEMO variable defined on \~/.env), however Standard Registries also have a new menu option once logged in. Under the “Administration” menu one can find a “Create Accounts” option that will lead to the same account creation process as before. This is depicted in the figures below.

<figure><img src="https://lh5.googleusercontent.com/6Bf2VGv10e31kfoVQqOzTn08xUgoGN2LXNVv7aFfe23O6SaKBuDKfQAadoxIT4nnaz2g9UeDlD1sFHIBRf2Q6cThA-2MipPfTzxzxZHVQZ0cTfi1Sq5_ptsVumF_IXGVoCulqHK0s4qYfCStkdVjbk8" alt=""><figcaption></figcaption></figure>

<figure><img src="https://lh3.googleusercontent.com/VBxCKipjGNLopz1gP-IJ80rsfoXJT5cnyXuFkfDLBDgZywYJMeurpauck8A8iK-Tqm8i_mm5ZtPiuJBSaAnqamsfF-Sb4t6IqvmODMmTmzozuIdm9mqpJXAaoQllAKPuXCF5d94xSf1TZ-5YxYLSgjs" alt=""><figcaption></figcaption></figure>
