# 🔨 Build executables and run manually

If you want to manually build every component with debug information, then build and run the services and packages in the following sequence: Interfaces, Logger Helper, Message Broker, Logger Service, Auth Service, IPFS, Guardian Service, UI Service, and lastly, the MRV Sender Service. See below for commands.

### Prerequisites for Manual Installation

* [MongoDB](https://www.mongodb.com/) ,
* [NodeJS](https://nodejs.org/)
* [Nats](https://nats.io/)

#### Build and start each component

Install, configure and start all the prerequisites, then build and start each component.

1. Clone the repo

```
git clone https://github.com/hashgraph/guardian.git
```

2\. From the **interfaces** folder

Build package

```
npm install
npm run build
```

3\. From the **common** folder

Build package

```
npm install
npm run build
```

4\. From the **logger-service** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

5\. From the **auth-service** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

6\. From the **ipfs-client** folder

To build the service:

```
npm install
npm run build
```

To start the service:

```
npm start
```

7\. From the **guardian-service** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3004](http://localhost:3004)):

```
npm start
```

8\. From the **api-gateway** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3002](https://localhost:3002)):

```
npm start
```

9\. From the **mrv-sender** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:3005](http://localhost:3005)):

```
npm start
```

10.From the **frontend** folder

To build the service:

```
npm install
npm run build
```

To start the service (found on [http://localhost:4200](http://localhost:4200))

```
npm start
```

Browse to [http://localhost:3000](http://localhost:3000) and complete the setup. To get more info, please check: [Launching Guardian](broken-reference/)
