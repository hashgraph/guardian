# 🔨 Build executables and run manually

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for Manual Installation

* [MongoDB](https://www.mongodb.com/) ,
* [NodeJS](https://nodejs.org/)
* [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/)
* [Nats](https://nats.io/)

#### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

#### Services Configuration:

*   for each of the services create the file `./<service_name>/.env` to do this copy, past and rename the file `./<service_name>/.env.template`

    For example:

    in `./guardian-service/.env`:

    ```plaintext
        GUARDIAN_ENV="develop"
    ```

    If need to configure OVERRIDE uncomment the variable in file `./guardian-service/.env`:

    ```plaintext
        OVERRIDE="false" 
    ```
*   configure the file `./<service_name>/configs/.env.<service>.<GUARDIAN_ENV>` file: to do this copy, past and rename the file `./<service_name>/.env.<service>.template`

    following previous example:

    in `./guardian-service/configs/.env.guardian.develop`:

```plaintext
OPERATOR_ID="..."
OPERATOR_KEY="..."
```

*   Setting up Chat GPT API KEY to enable AI Search and Guided Search:

    For setting up AI and Guided Search, we need to set OPENAI\_API\_KEY variable in `./ai-service/configs/.env*` files.

    ```
    OPENAI_API_KEY="..."
    ```

_**NOTE:**_ Once you start each service, please wait for the initialization process to be completed.\*\*

1. Clone the repo

```
git clone https://github.com/hashgraph/guardian.git
```

2. Install dependencies

```
yarn
```

3. Build _**@guardian/interfaces**_ package

```
 yarn workspace @guardian/interfaces run build
```

4. Build _**@guardian/common**_ package

```
yarn workspace @guardian/common run build
```

5. Build and start _**logger-service**_ service

To build the service:

```
 yarn workspace logger-service run build
```

Configure the service as previously described. Do not need special variables configuration.

To start the service:

```
yarn workspace logger-service start
```

6. Build and start _**auth-service**_ service

To build the service:

```
yarn workspace auth-service run build
```

Configure the service as previously described. Do not need special variables configuration.

To start the service:

```
yarn workspace auth-service start
```

7. Build and start _**policy-service**_ service

To build the service:

```
yarn workspace policy-service run build
```

Configure the service as previously described. Do not need special variables configuration.

To start the service:

```
yarn workspace policy-service start
```

8. Build and start _**worker-service**_ service To build the service:

```
yarn workspace worker-service run build
```

Configure the service as previously described. Update **IPFS\_STORAGE\_API\_KEY** value in `./worker-service/configs/.env.worker` file.

To start the service:

```
yarn workspace worker-service start
```

9. Build and start **notification**_**-service**_ service

To build the service:

Yarn:

```
yarn workspace notification-service run build
```

Npm:

```
npm --workspace=notification-service run build
```

Configure the service as previously described. Update **OPERATOR\_ID** and **OPERATOR\_KEY** values in `./guardian-service/configs/.env.worker` file as in the example above.

To start the service (found on [http://localhost:3002](http://localhost:3002/)):

Yarn:

```
yarn workspace notification-service start
```

Npm:

```
npm --workspace=notification-service start
```

10. Build and start _**guardian-service**_ service

To build the service:

```
yarn workspace guardian-service run build
```

Configure the service as previously described. Update **OPERATOR\_ID** and **OPERATOR\_KEY** values in `./guardian-service/configs/.env.worker` file as in the example above.

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
 yarn workspace guardian-service start
```

11. Build and start _**api-gateway**_ service

To build the service:

```
yarn workspace api-gateway run build
```

Configure the service as previously described. Do not need special variables configuration.

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
yarn workspace api-gateway start
```

12. From the **mrv-sender** folder

To build the service:

```
npm install
npm run build
```

Configure the service as previously described. Do not need special variables configuration.

To start the service (found on [http://localhost:3005](http://localhost:3005)):

```
npm start
```

13. **From the ai-service folder**

To build the service:

Yarn:

```
yarn workspace ai-service run build
```

Npm:

```
npm --workspace=ai-service run build
```

Configure the service as previously described. Do not need special configuration variables.

Yarn:

```
yarn workspace ai-service start
```

Npm:

```
npm --workspace=ai-service start
```

14. From the **frontend** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:4200](http://localhost:4200))

```
npm start
```

Browse to [http://localhost:3000](http://localhost:3000) and complete the setup. To get more info, please check: [Launching Guardian](launching-guardian.md)
