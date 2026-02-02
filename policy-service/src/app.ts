import { ApplicationState, JwtServicesValidator, COMMON_CONNECTION_CONFIG, DatabaseServer, entities, LargePayloadContainer, MessageBrokerChannel, mongoForLoggingInitialization, PinoLogger, pinoLoggerInitialization, Users, Wallet, OldSecretManager } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { PolicyContainer } from './helpers/policy-container.js';
import { BlockService } from './policy-engine/block-service.js';
import { startMetricsServer } from './utils/metrics.js';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { DEFAULT_MONGO } from '#constants';
import { BlockTreeGenerator } from './policy-engine/block-tree-generator.js';

export const obj = {};

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
            maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
            maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10)
        },
        ensureIndexes: true,
        entities
    }),
    MessageBrokerChannel.connect('policy-service'),
    mongoForLoggingInitialization()
]).then(async values => {
    const [db, cn, loggerMongo] = values;

    const jwtServiceName = 'POLICY_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    //Debug mode
    await new OldSecretManager().setConnection(cn).init();

    const state = new ApplicationState();
    await state.setServiceName('POLICY_SERVICE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    state.updateState(ApplicationStates.INITIALIZING);

    // await new PolicyContainer().setConnection(cn).init();

    DatabaseServer.connectBD(db);
    DatabaseServer.connectGridFS();

    await new Users().setConnection(cn).init();
    await new Wallet().setConnection(cn).init();

    await (new PolicyContainer(logger)).setConnection(cn).init();
    await (new BlockService()).setConnection(cn).init();
    (new BlockTreeGenerator()).setConnection(cn);

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }
    await logger.info('Policy service started', ['POLICY_SERVICE'], null);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
