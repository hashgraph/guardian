import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import { ApplicationState, MessageBrokerChannel, Logger, DB_DI, Migration, COMMON_CONNECTION_CONFIG } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Hashicorp, InitializeVault } from './vaults';

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
    InitializeVault(process.env.VAULT_PROVIDER)
]).then(async ([_, db, cn, vault]) => {
    DB_DI.orm = db;
    const state = new ApplicationState('AUTH_SERVICE');
    const channel = new MessageBrokerChannel(cn, 'auth-service');

    state.setChannel(channel);
    state.updateState(ApplicationStates.INITIALIZING);
    await fixtures();

    new Logger().setChannel(channel);
    new AccountService(channel).registerListeners();
    new WalletService(channel, vault).registerListeners();

    state.updateState(ApplicationStates.READY);
    new Logger().info('auth service started', ['AUTH_SERVICE']);
});
