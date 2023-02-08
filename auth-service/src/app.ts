import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { ApplicationState, MessageBrokerChannel, Logger, DB_DI, Migration, COMMON_CONNECTION_CONFIG } from '@guardian/common';
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
]).then(async ([_, db, cn]) => {
    DB_DI.orm = db;
    const state = new ApplicationState('AUTH_SERVICE');
    const channel = new MessageBrokerChannel(cn, 'auth-service');

    state.setChannel(channel);
    state.updateState(ApplicationStates.INITIALIZING);
    try {
        await fixtures();

        new Logger().setChannel(channel);
        new AccountService(channel).registerListeners();

        state.updateState(ApplicationStates.READY);
        new Logger().info('auth service started', ['AUTH_SERVICE']);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
