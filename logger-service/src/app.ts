import { loggerAPI } from '@api/logger.service';
import { Log } from '@entity/log';
import { MessageBrokerChannel, ApiServer } from '@guardian/common';
import { Connection } from 'typeorm';

const PORT = parseInt(process.env.PORT) || 3004;

(async () => {
    const server = new ApiServer({
        port: PORT,
        name: 'LOGGER_SERVICE',
        channelName: 'logger-service',
        requireDB: true,
        entities: [Log],
        onReady: async (db: Connection, channel: MessageBrokerChannel) => {
            const logRepository = db.getMongoRepository(Log);
            await loggerAPI(channel, logRepository);
        }
    });

    await server.start();
})();