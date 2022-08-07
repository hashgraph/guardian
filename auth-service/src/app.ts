import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import { ApplicationState, MessageBrokerChannel, Logger, DataBaseHelper, DB_DI } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';

Promise.all([
    MikroORM.init<MongoDriver>({
        type: 'mongo',
        dbName: process.env.DB_DATABASE,
        clientUrl:`mongodb://${process.env.DB_HOST}`,
        driverOptions: {
            useUnifiedTopology: true
        },
        entities: [
            'dist/entity/*.js'
        ]
    }),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
]).then(async ([db, cn]) => {
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
