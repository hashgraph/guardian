import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import {
    ApplicationState,
    MessageBrokerChannel,
    Logger,
    DataBaseHelper,
    Migration,
    COMMON_CONNECTION_CONFIG,
    LargePayloadContainer
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { InitializeVault } from './vaults';
import { ImportKeysFromDatabase } from '@helpers/import-keys-from-database';
import process from 'process';
import { SecretManager } from '@guardian/common/dist/secret-manager';
import { OldSecretManager } from '@guardian/common/dist/secret-manager/old-style/old-secret-manager';

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
    MessageBrokerChannel.connect('AUTH_SERVICE'),
    InitializeVault(process.env.VAULT_PROVIDER)
]).then(async ([_, db, cn, vault]) => {
    DataBaseHelper.orm = db;
    const state = new ApplicationState();
    await state.setServiceName('AUTH_SERVICE').setConnection(cn).init();
    state.updateState(ApplicationStates.INITIALIZING);
    try {
        await fixtures();

        new Logger().setConnection(cn);
        await new AccountService().setConnection(cn).init();
        new AccountService().registerListeners();
        await new WalletService().setConnection(cn).init();
        new WalletService().registerVault(vault);
        new WalletService().registerListeners();

        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault);
        }

        await new OldSecretManager().setConnection(cn).init();

        const secretManager = SecretManager.New();
        let {ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth');
        if (!ACCESS_TOKEN_SECRET) {
            ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
            await secretManager.setSecrets('secretkey/auth', { ACCESS_TOKEN_SECRET  });
        }

        state.updateState(ApplicationStates.READY);
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        new Logger().info('auth service started', ['AUTH_SERVICE']);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
