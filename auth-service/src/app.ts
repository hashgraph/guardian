import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import { ApplicationState, MessageBrokerChannel, Logger, DB_DI, Migration } from '@guardian/common';
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
            path: 'dist/migrations'
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
]).then(async ([_, db, cn]) => {
    DB_DI.orm = db;
    const state = new ApplicationState('AUTH_SERVICE');
    const channel = new MessageBrokerChannel(cn, 'auth-service');
    state.setChannel(channel);
    state.updateState(ApplicationStates.INITIALIZING);
    await fixtures();

    new Logger().setChannel(channel);
    new AccountService(channel).registerListeners();
    new WalletService(channel).registerListeners();

    state.updateState(ApplicationStates.READY);
    new Logger().info('auth service started', ['AUTH_SERVICE']);
});
