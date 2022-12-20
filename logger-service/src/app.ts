import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { ApplicationState, COMMON_CONNECTION_CONFIG, DataBaseHelper, DB_DI, MessageBrokerChannel, Migration } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        }
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
]).then(async values => {
    const [_, db, mqConnection] = values;
    DB_DI.orm = db;
    const channel = new MessageBrokerChannel(mqConnection, 'logger-service');
    const state = new ApplicationState('LOGGER_SERVICE');
    state.setChannel(channel);
    state.updateState(ApplicationStates.STARTED);
    const logRepository = new DataBaseHelper(Log);

    state.updateState(ApplicationStates.INITIALIZING);
    await loggerAPI(channel, logRepository);

    state.updateState(ApplicationStates.READY);
    console.log('logger service started', await state.getState());
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
