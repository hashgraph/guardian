import { AccountService } from './api/account-service.js';
import { WalletService } from './api/wallet-service.js';
import { ApplicationState, COMMON_CONNECTION_CONFIG, DatabaseServer, GenerateTLSOptionsNats, JwtServicesValidator, LargePayloadContainer, MessageBrokerChannel, Migration, mongoForLoggingInitialization, OldSecretManager, PinoLogger, pinoLoggerInitialization, SecretManager, ValidateConfiguration, Wallet, Workers } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { InitializeVault } from './vaults/index.js';
import { ImportKeysFromDatabase } from './helpers/import-keys-from-database.js';
import process from 'node:process';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { MeecoAuthService } from './api/meeco-service.js';
import { ApplicationEnvironment } from './environment.js';
import { RoleService } from './api/role-service.js';
import { RelayerAccountsService } from './api/relayer-accounts.js';
import { DEFAULT_MONGO } from '#constants';
import { checkValidJwt } from './utils/index.js';

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
            tls: GenerateTLSOptionsNats()
        },
    }),
    InitializeVault(process.env.VAULT_PROVIDER),
    mongoForLoggingInitialization(),
]).then(async ([_, db, cn, app, vault, loggerMongo]) => {

    DatabaseServer.connectBD(db);
    try {
        await new OldSecretManager().setConnection(cn).init();
        const jwtServiceName = 'AUTH_SERVICE';
        const secretManager = SecretManager.New();

        JwtServicesValidator.setServiceName(jwtServiceName);

        await new WalletService().setConnection(cn).init();
        new WalletService().registerVault(vault);
        const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);
        new WalletService().registerListeners(logger);

        await new Wallet().setConnection(cn).init();

        await new Workers().setConnection(cn).init();
        new Workers().initListeners();

        const state = new ApplicationState();
        await state.setServiceName('AUTH_SERVICE').setConnection(cn).init();

        state.updateState(ApplicationStates.INITIALIZING);
        app.listen();

        await new AccountService().setConnection(cn).init();
        new AccountService().registerListeners(logger);

        await new RoleService().setConnection(cn).init();
        new RoleService().registerListeners(logger);

        await new RelayerAccountsService().setConnection(cn).init();
        new RelayerAccountsService().registerListeners(logger);

        const validator = new ValidateConfiguration();

        if (parseInt(process.env.MEECO_AUTH_PROVIDER_ACTIVE, 10)) {
            await new MeecoAuthService().setConnection(cn).init();
            new MeecoAuthService().registerListeners(logger);
        }

        if (process.env.IMPORT_KEYS_FROM_DB) {
            await ImportKeysFromDatabase(vault, logger);
        }

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

            const isValidEnvTokens = checkValidJwt(process.env.JWT_PUBLIC_KEY, process.env.JWT_PRIVATE_KEY);

            if (isValidEnvTokens) {
                await secretManager.setSecrets('secretkey/auth', { JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY, JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY });
            } else {
                const { JWT_PRIVATE_KEY, JWT_PUBLIC_KEY } = await secretManager.getSecrets('secretkey/auth');

                const isValidSecretManagerTokens = checkValidJwt(JWT_PUBLIC_KEY, JWT_PRIVATE_KEY);

                if (!isValidSecretManagerTokens) {
                    return false;
                }
            }

            return true;
        })

        validator.setValidAction(async () => {
            import(
                `./helpers/fixtures${ApplicationEnvironment.demoMode ? '.demo' : ''}.js`
            ).then(async (module) => {
                await module.fixtures();
            });
            state.updateState(ApplicationStates.READY);
            const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
            if (Number.isInteger(maxPayload)) {
                new LargePayloadContainer().runServer();
            }
            await logger.info('auth service started', ['AUTH_SERVICE'], null);
        })
        validator.setInvalidAction(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
            await logger.error('Auth service not configured', ['AUTH_SERVICE'], null);
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
