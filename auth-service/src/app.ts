import { AccountService } from './api/account-service.js';
import { WalletService } from './api/wallet-service.js';
import {
    ApplicationState,
    COMMON_CONNECTION_CONFIG,
    DataBaseHelper,
    LargePayloadContainer,
    MessageBrokerChannel,
    Migration,
    mongoForLoggingInitialization,
    OldSecretManager,
    PinoLogger,
    pinoLoggerInitialization,
    SecretManager,
    ValidateConfiguration,
} from '@guardian/common';
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
import { RoleService } from './api/role-service.js';
import { DEFAULT_MONGO } from '#constants';

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false,
        },
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true,
            minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
            maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
            maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10),
        },
        ensureIndexes: true,
    }),
    MessageBrokerChannel.connect('AUTH_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            queue: 'auth-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`,
            ],
        },
    }),
    InitializeVault(process.env.VAULT_PROVIDER),
    mongoForLoggingInitialization(),
]).then(async ([_, db, cn, app, vault, loggerMongo]) => {
    DataBaseHelper.orm = db;
    const state = new ApplicationState();
    await state.setServiceName('AUTH_SERVICE').setConnection(cn).init();

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    state.updateState(ApplicationStates.INITIALIZING);
    try {
        app.listen();

        await new AccountService().setConnection(cn).init();
        new AccountService().registerListeners(logger);
        await new WalletService().setConnection(cn).init();
        new WalletService().registerVault(vault);
        new WalletService().registerListeners(logger);

        await new RoleService().setConnection(cn).init();
        new RoleService().registerListeners(logger);

        const validator = new ValidateConfiguration();

        if (parseInt(process.env.MEECO_AUTH_PROVIDER_ACTIVE, 10)) {
            await new MeecoAuthService().setConnection(cn).init();
            new MeecoAuthService().registerListeners(logger);
        }

        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault, logger);
        }

        await new OldSecretManager().setConnection(cn).init();

        validator.setValidator(async () => {
            if (!ApplicationEnvironment.demoMode) {
                if (!process.env.SR_INITIAL_PASSWORD) {
                    console.log('Empty SR_INITIAL_PASSWORD setting');
                    return false;
                }
                if (process.env.SR_INITIAL_PASSWORD.length < 6) {
                    console.log('SR_INITIAL_PASSWORD length is less than 6');
                    return false;
                }
            }
            const secretManager = SecretManager.New();
            let {ACCESS_TOKEN_SECRET} = await secretManager.getSecrets('secretkey/auth');
            if (!ACCESS_TOKEN_SECRET) {
                ACCESS_TOKEN_SECRET = process.env.JWT_PRIVATE_KEY;
                if (ACCESS_TOKEN_SECRET.length < 8) {
                    return false;
                }
                await secretManager.setSecrets('secretkey/auth', {ACCESS_TOKEN_SECRET});
            }
            return true;
        })

        validator.setValidAction(async () => {
            import(
                `./helpers/fixtures${
                    ApplicationEnvironment.demoMode ? '.demo' : ''
                }.js`
            ).then(async (module) => {
                await module.fixtures();
            });
            state.updateState(ApplicationStates.READY);
            const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
            if (Number.isInteger(maxPayload)) {
                new LargePayloadContainer().runServer();
            }
            await logger.info('auth service started', ['AUTH_SERVICE']);
        })
        validator.setInvalidAction(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
            await logger.error('Auth service not configured', ['AUTH_SERVICE']);
        })
        await validator.validate();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

    // startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
