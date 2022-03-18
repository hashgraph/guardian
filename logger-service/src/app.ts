import FastMQ from 'fastmq';
import { createConnection } from 'typeorm';
import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';

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

    const logRepository = db.getMongoRepository(Log);

    await loggerAPI(channel, logRepository);

    console.log('logger service started');
})
