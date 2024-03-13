import { AccountService } from './api/account-service.js';
import { WalletService } from './api/wallet-service.js';
import { ApplicationState, COMMON_CONNECTION_CONFIG, DataBaseHelper, LargePayloadContainer, Logger, MessageBrokerChannel, Migration, OldSecretManager, SecretManager } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { InitializeVault } from './vaults/index.js';
import { ImportKeysFromDatabase } from './helpers/import-keys-from-database.js';
import process from 'process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MeecoAuthService } from './api/meeco-service.js';
import { ApplicationEnvironment } from './environment.js';

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true
    }),
    MessageBrokerChannel.connect('AUTH_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
        transport: Transport.NATS,
        options: {
            queue: 'auth-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`,
            ],
        },
    }),
    InitializeVault(process.env.VAULT_PROVIDER)
]).then(async ([_, db, cn,  app, vault]) => {
    DataBaseHelper.orm = db;
    const state = new ApplicationState();
    await state.setServiceName('AUTH_SERVICE').setConnection(cn).init();
    state.updateState(ApplicationStates.INITIALIZING);
    try {
        if (!ApplicationEnvironment.demoMode) {
            import('./helpers/fixtures.demo.js').then(async (module) => {
                await module.fixtures();
            });
        }

        // Include accounts for demo builds only
        if (ApplicationEnvironment.demoMode) {
            import('./helpers/fixtures.demo.js').then(async (module) => {
                await module.fixtures();
            });
        }

        app.listen();

        new Logger().setConnection(cn);
        await new AccountService().setConnection(cn).init();
        new AccountService().registerListeners();
        await new WalletService().setConnection(cn).init();
        new WalletService().registerVault(vault);
        new WalletService().registerListeners();

        if (parseInt(process.env.MEECO_AUTH_PROVIDER_ACTIVE, 10)) {
            await new MeecoAuthService().setConnection(cn).init();
            new MeecoAuthService().registerListeners();
        }

        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault);
        }

        await new OldSecretManager().setConnection(cn).init();
        const secretManager = SecretManager.New();
        let {ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth');
        if (!ACCESS_TOKEN_SECRET) {
            ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
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

    // startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
