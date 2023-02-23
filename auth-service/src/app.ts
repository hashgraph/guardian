import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import { ApplicationState, MessageBrokerChannel, Logger, DB_DI, Migration, COMMON_CONNECTION_CONFIG } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { InitializeVault } from './vaults';
import { ImportKeysFromDatabase } from '@helpers/import-keys-from-database';
import { startMetricsServer } from './utils/metrics';

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
    try {
        await fixtures();

        new Logger().setChannel(channel);
        new AccountService(channel).registerListeners();
        new WalletService(channel, vault).registerListeners();

        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault);
        }

        state.updateState(ApplicationStates.READY);
        new Logger().info('auth service started', ['AUTH_SERVICE']);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
