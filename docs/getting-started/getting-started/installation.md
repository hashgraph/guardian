# Installation

1.  Clone the repo

    ```
    git clone https://github.com/hashgraph/guardian.git
    ```
2.  Update the following files with your Hedera Testnet account info as indicated. Please keep in mind that this Hedera Operator ID and Operator Key is used for this reference implementation as a placeholder until there is a wallet integration. There will be other steps in the Demo Usage Guide that will require the generation of Operator IDs and Operator Keys. It is important to mention that the Operator IDs and Operator Keys in the .env will be used to generate demo accounts.

    For example:

    in `ui-service/.env`:

    ```
    OPERATOR_ID=0.0.123456789
    OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
    ```

    in `ui-service/.env.docker`:

    ```
    OPERATOR_ID=0.0.123456789
    OPERATOR_KEY=302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6
    ```

    in `guardian-service/config.json`:

    ```
    {"OPERATOR_ID":"0.0.123456789","OPERATOR_KEY":"302e020100300506032b657004220420f4361ec73dc43e568f1620a7b7ecb7330790b8a1c7620f1ce353aa1de4f0eaa6"}
    ```

    * The `OPERATOR_ID` is the Hedera account's `accountId`
    * The `OPERATOR_KEY` is the Hedera account's `privateKey`
    * The `TOPIC_ID` is used when connecting to an existing topic. If you don't have one, delete the `TOPIC_ID` line.
3.  If you want to build with Docker (Once this step you are finished)

    ```
    docker-compose up -d --build
    ```
4.  If you want to manually build every component, then build and run the services in the following sequence: Message Broker, UI Service, Guardian Service, and lastly, the MRV Sender Service. See below for commands.

    **From the Message broker folder (Need to run first)**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service:

    ```
    npm start
    ```

    **From the UI Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on [http://localhost:3002](http://localhost:3002)):

    ```
    npm start
    ```

    **From the Guardian Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on [http://localhost:3004](http://localhost:3004)):

    ```
    npm start
    ```

    **From the MRV Sender Service folder**

    To build the service:

    ```
    npm install
    npm run build
    ```

    To start the service (found on [http://localhost:3005](http://localhost:3005)):

    ```
    npm start
    ```

#### Unit Tests

To run **guardian-service** unit tests, following commands needs to be executed:

```
cd guardian-service 
npm run test
```

To run **vc-modules** unit tests, following commands needs to be executed:

```
cd vc-modules
npm run test
```

It is also an ability to run Hedera network test only. To do that, the following command needs to be executed:

```
npm run test:network
```

To run stability tests (certain transactions will be executed 10 times each), the following command needs to be executed:

```
npm run test:stability
```

To run **ui-service** unit tests, following commands needs to be executed:

```
cd ui-service
npm run test
```

To run **message-broker** unit tests, following commands needs to be executed:

```
cd message-broker
npm run test
```

#### Swagger API

After successfully launching your application, you can find the generated Swagger API by [following this link](http://localhost:3002/api-docs).

#### Postman Collection

Postman Collection that covers all available API endpoints could be found [here](https://github.com/hashgraph/guardian/tree/main/ui-service/api/Guardian%20API.postman\_collection.json).
