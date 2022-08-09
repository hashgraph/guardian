import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { ApplicationState, DataBaseHelper, DB_DI, MessageBrokerChannel, Migration } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

const connectionConfig: any = {
    type: 'mongo',
    dbName: process.env.DB_DATABASE,
    clientUrl:`mongodb://${process.env.DB_HOST}`,
    entities: [
        'dist/entity/*.js'
    ]
};

Promise.all([
    Migration({
        ...connectionConfig,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        }
    }),
    MikroORM.init<MongoDriver>({
        ...connectionConfig,
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
})
