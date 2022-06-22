import { createConnection } from 'typeorm';
import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { ApplicationState, MessageBrokerChannel } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces'


Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: true,
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
]).then(async values => {
    const [db, mqConnection] = values;
    const channel = new MessageBrokerChannel(mqConnection, 'logger-service')
    const state = new ApplicationState('LOGGER_SERVICE');
    state.setChannel(channel);
    state.updateState(ApplicationStates.STARTED);
    const logRepository = db.getMongoRepository(Log);

    state.updateState(ApplicationStates.INITIALIZING);
    await loggerAPI(channel, logRepository);

    state.updateState(ApplicationStates.READY);
    console.log('logger service started', await state.getState());
})
