import FastMQ from 'fastmq';
import { createConnection } from 'typeorm';
import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { ApplicationState, ApplicationStates } from 'interfaces';

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
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS),
]).then(async values => {
    const [db, channel] = values;

    const state = new ApplicationState('logger_service');
    state.setChannel(channel);
    state.updateState(ApplicationStates.STARTED);
    const logRepository = db.getMongoRepository(Log);

    state.updateState(ApplicationStates.INITIALIZING);
    await loggerAPI(channel, logRepository);

    state.updateState(ApplicationStates.READY);
    console.log('logger service started');
})
