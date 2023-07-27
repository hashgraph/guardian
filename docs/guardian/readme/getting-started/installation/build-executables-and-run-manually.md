# 🔨 Build executables and run manually

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for Manual Installation

* [MongoDB](https://www.mongodb.com/) ,
* [NodeJS](https://nodejs.org/)
* [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/)
* [Nats](https://nats.io/)

#### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

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

5. &#x20;Build and start _**logger-service**_ service

To build the service:

```
 yarn workspace logger-service run build
```

To start the service:

```
yarn workspace logger-service start
```

6. Build and start _**auth-service**_ service

To build the service:

```
yarn workspace auth-service run build
```

To start the service:

```
yarn workspace auth-service start
```

7. Build and start _**policy-service**_ service

To build the service:

```
yarn workspace policy-service run build
```

To start the service:

```
yarn workspace policy-service start
```

8. Build and start _**worker-service**_ service

Update **IPFS\_STORAGE\_API\_KEY** value in _**worker-service/configs/.env.worker**_ file.

To build the service:

```
yarn workspace worker-service run build
```

To start the service:

```
yarn workspace worker-service start
```

9. Build and start _**guardian-service**_ service

Update **OPERATOR\_ID** and **OPERATOR\_KEY** values in _**guardian-service/configs/.env.worker**_ file.

To build the service:

```
yarn workspace guardian-service run build
```

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
 yarn workspace guardian-service start
```

10. Build and start _**api-gateway**_ service

To build the service:

```
yarn workspace api-gateway run build
```

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
yarn workspace api-gateway start
```

11. From the **mrv-sender** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3005](http://localhost:3005)):

```
npm start
```

12. From the **frontend** folder

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
