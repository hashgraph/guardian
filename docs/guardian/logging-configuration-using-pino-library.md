# Logging Configuration using Pino Library

## Introduction

The logger has been implemented using the Pino library. Four transports have been added for logging: console output, MongoDB, file, and Seq storage.

### Description

In the .env file, nine environment variables have been provided. Five of them are default variables for configuring logging to MongoDB, file, and Seq. These are typically constant variables and should not be changed:

```
DB_LOGGER_NAME="logger_db
DB_LOGGER_HOST="localhost"
DB_LOGGER_COLLECTION="log"
LOG_FILE_PATH="./logs/app.log"
LOG_LEVEL="info"
SEQ_API_KEY=""1
SEQ_SERVER_URL="http://localhost:5341"2
SEQ_UI_URL="http://localhost:5341"3
```

{% hint style="info" %}
Note:

1 The SEQ\_API\_KEY is an optional variable that allows adding an API key for authentication with the Seq server. It should be set if authentication is required.

2 When manually building the application, the variables above should be specified in the .env files at the micro -services level

3 When manually building the application, SEQ\_UI\_URL needs to be specified in the api-gateway service only.
{% endhint %}

### Transports

The TRANSPORTS environment variable allows to specify the transports used for logging to various storage options. By default, logs are output to the console and recorded in MongoDB. The default value for the variable looks like this:

```
TRANSPORTS="CONSOLE, MONGO"
```

However, it can be extended to:

```
TRANSPORTS="CONSOLE, MONGO, FILE, SEQ"
```

In this case, logs will also be recorded in a log file and Seq storage.

### Console

Logging to the console will occur only if CONSOLE is included in the TRANSPORTS variable.&#x20;

**Example:**

```
TRANSPORTS="CONSOLE"
```

### MongoDB

Logging to MongoDB will occur only if the DB\_LOGGER\_NAME variable is specified and MONGO is included in the TRANSPORTS variable.&#x20;

**Example:**

```
TRANSPORTS="MONGO"
```

**Required Environment Variables for MongoDB Logging**

DB\_LOGGER\_NAME: The name of the MongoDB database used for logging.

DB\_LOGGER\_HOST: The host address of the MongoDB server.

DB\_LOGGER\_COLLECTION: The name of the collection where logs will be stored.

### File

Logging to a file will occur only if FILE is included in the TRANSPORTS variable.&#x20;

**Example:**

```
TRANSPORTS="FILE"
```

**Required Environment Variable for File Logging**

LOG\_FILE\_PATH: The file path where the logs will be stored.

### Seq

If you want to use Seq storage ([https://datalust.co/seq](https://datalust.co/seq)), you must first run it in a container using the following command:

```
docker run --name seq -d --restart unless-stopped -e ACCEPT_EULA=Y -p 5341:80 datalust/seq:latest
```

Logging to Seq will occur only if SEQ is included in the TRANSPORTS variable.&#x20;

**Example:**

```
TRANSPORTS="SEQ"
```

**Required Environment Variables for Seq Logging**

SEQ\_SERVER\_URL: The URL of the Seq server for internal logging purposes.

SEQ\_UI\_URL: The URL of the Seq server for external access (viewing logs in a browser).

SEQ\_API\_KEY: The API key used for authenticating requests to the Seq server. This variable allows adding the API key during the initialization of the Seq logger.

## Contribution

### Adding New Transports

To add new transports for logging, you can update the `pino-logger.ts` file. New transports should be added to the MAP\_TRANSPORTS map.

{% hint style="info" %}
**Note:** Don't forget to add your new transport to the TRANSPORTS variable in the .env file.
{% endhint %}

## Additional Documentation

For more detailed information on Pino transports and configurations, refer to the official Pino documentation: [https://getpino.io/#/docs/transports](https://getpino.io/#/docs/transports)
