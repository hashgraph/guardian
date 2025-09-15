import { configAPI } from './api/config.service.js';
import { documentsAPI } from './api/documents.service.js';
import { profileAPI } from './api/profile.service.js';
import { schemaAPI } from './api/schema.service.js';
import { tokenAPI } from './api/token.service.js';
import { trustChainAPI } from './api/trust-chain.service.js';
import { PolicyEngineService } from './policy-engine/policy-engine.service.js';
import {
    ApplicationState,
    COMMON_CONNECTION_CONFIG,
    DatabaseServer,
    Environment,
    ExternalEventChannel,
    GenerateTLSOptionsNats,
    IPFS,
    LargePayloadContainer,
    MessageBrokerChannel,
    MessageServer,
    Migration,
    mongoForLoggingInitialization,
    OldSecretManager,
    PinoLogger,
    pinoLoggerInitialization,
    Policy,
    SecretManager,
    TopicMemo,
    TransactionLogger,
    TransactionLogLvl,
    Users,
    ValidateConfiguration,
    Wallet,
    Workers,
    entities,
    JwtServicesValidator,
    NotificationEvents
} from '@guardian/common';
import { ApplicationStates, PolicyEvents, PolicyStatus, WorkerTaskType } from '@guardian/interfaces';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
import { ipfsAPI } from './api/ipfs.service.js';
import { artifactAPI } from './api/artifact.service.js';
import { sendKeysToVault } from './helpers/send-keys-to-vault.js';
import { contractAPI, syncRetireContracts, syncWipeContracts } from './api/contract.service.js';
import { PolicyServiceChannelsContainer } from './helpers/policy-service-channels-container.js';
import { PolicyEngine } from './policy-engine/policy-engine.js';
import { modulesAPI } from './api/module.service.js';
import { toolsAPI } from './api/tool.service.js';
import { statisticsAPI } from './api/policy-statistics.service.js';
import { schemaRulesAPI } from './api/schema-rules.service.js';
import { GuardiansService } from './helpers/guardians.js';
import { mapAPI } from './api/map.service.js';
import { tagsAPI } from './api/tag.service.js';
import { demoAPI } from './api/demo.service.js';
import { themeAPI } from './api/theme.service.js';
import { brandingAPI } from './api/branding.service.js';
import { wizardAPI } from './api/wizard.service.js';
import { startMetricsServer } from './utils/metrics.js';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'process';
import { AppModule } from './app.module.js';
import { analyticsAPI } from './api/analytics.service.js';
import { suggestionsAPI } from './api/suggestions.service.js';
import { SynchronizationTask } from './helpers/synchronization-task.js';
import { recordAPI } from './api/record.service.js';
import { projectsAPI } from './api/projects.service.js';
import { AISuggestionsService } from './helpers/ai-suggestions.js';
import { AssignedEntityAPI } from './api/assigned-entity.service.js';
import { permissionAPI } from './api/permission.service.js';
import { setDefaultSchema } from './api/helpers/default-schemas.js';
import { policyLabelsAPI } from './api/policy-labels.service.js';
import { initMathjs } from './utils/formula.js';
import { formulasAPI } from './api/formulas.service.js';
import { externalPoliciesAPI } from './api/external-policies.service.js';

export const obj = {};

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
        ensureIndexes: true,
        entities
    }, [
        'v2-4-0',
        'v2-7-0',
        'v2-9-0',
        'v2-11-0',
        'v2-12-0',
        'v2-13-0',
        'v2-16-0',
        'v2-17-0',
        'v2-18-0',
        'v2-20-0',
        'v2-23-1',
        'v2-27-1',
        'v2-28-0',
    ]),
    MessageBrokerChannel.connect('GUARDIANS_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            queue: 'guardian-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            tls: GenerateTLSOptionsNats()
        },
    }),
    mongoForLoggingInitialization()
]).then(async values => {
    const [db, cn, app, loggerMongo] = values;

    app.listen();

    DatabaseServer.connectBD(db);

    DatabaseServer.connectGridFS();

    await new OldSecretManager().setConnection(cn).init();
    const secretManager = SecretManager.New();
    const jwtServiceName = 'GUARDIAN_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

    let OPERATOR_ID = process.env.OPERATOR_ID;
    let OPERATOR_KEY = process.env.OPERATOR_KEY;

    if (OPERATOR_ID?.length > 4 && OPERATOR_KEY?.length > 4) {
        await secretManager.setSecrets('keys/operator', {
            OPERATOR_ID,
            OPERATOR_KEY
        })
    } else {
        const { OPERATOR_ID: operatorId, OPERATOR_KEY: operatorKey } = await secretManager.getSecrets('keys/operator');

        OPERATOR_ID = operatorId;
        OPERATOR_KEY = operatorKey;
    }

    new PolicyServiceChannelsContainer().setConnection(cn);
    new TransactionLogger().initialization(
        cn,
        process.env.TRANSACTION_LOG_LEVEL as TransactionLogLvl,
    );
    new GuardiansService().setConnection(cn).init();
    const channel = new MessageBrokerChannel(cn, 'guardians');

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);
    NotificationEvents.init(new GuardiansService());

    const state = new ApplicationState();
    await state.setServiceName('GUARDIAN_SERVICE').setConnection(cn).init();

    await new AISuggestionsService().setConnection(cn).init();

    await state.updateState(ApplicationStates.STARTED);

    const dataBaseServer = new DatabaseServer();

    try {
        await configAPI(logger);
        await schemaAPI(logger);
        await tokenAPI(dataBaseServer, logger);
        await profileAPI(logger);
        await documentsAPI(dataBaseServer);
        await demoAPI(dataBaseServer, logger);
        await trustChainAPI(dataBaseServer, logger);
        await artifactAPI(logger);
        await contractAPI(dataBaseServer, logger);
        await modulesAPI(logger);
        await toolsAPI(logger);
        await tagsAPI(logger);
        await analyticsAPI(logger);
        await mapAPI(logger);
        await themeAPI(logger);
        await wizardAPI(logger);
        await recordAPI(logger);
        await brandingAPI(dataBaseServer);
        await suggestionsAPI();
        await projectsAPI(logger);
        await AssignedEntityAPI(logger)
        await permissionAPI(logger);
        await statisticsAPI(logger);
        await schemaRulesAPI(logger);
        await policyLabelsAPI(logger);
        await formulasAPI(logger);
        await externalPoliciesAPI(logger);
    } catch (error) {
        console.error(error.message);
        process.exit(0);
    }

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    if (process.env.HEDERA_CUSTOM_NODES) {
        try {
            const nodes = JSON.parse(process.env.HEDERA_CUSTOM_NODES);
            Environment.setNodes(nodes);
        } catch (error) {
            await logger.warn(
                'HEDERA_CUSTOM_NODES field in settings: ' + error.message,
                ['GUARDIAN_SERVICE'],
                null
            );
            console.warn(error);
        }
    }
    if (process.env.HEDERA_CUSTOM_MIRROR_NODES) {
        try {
            const mirrorNodes = JSON.parse(
                process.env.HEDERA_CUSTOM_MIRROR_NODES
            );
            Environment.setMirrorNodes(mirrorNodes);
        } catch (error) {
            await logger.warn(
                'HEDERA_CUSTOM_MIRROR_NODES field in settings: ' + error.message,
                ['GUARDIAN_SERVICE'],
                null
            );
            console.warn(error);
        }
    }
    MessageServer.setLang(process.env.MESSAGE_LANG);
    // TransactionLogger.init(channel, process.env.LOG_LEVEL as TransactionLogLvl);
    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    await new Users().setConnection(cn).init();
    await new Wallet().setConnection(cn).init();
    const workersHelper = new Workers();
    await workersHelper.setConnection(cn).init();
    workersHelper.initListeners();

    const validator = new ValidateConfiguration();
    let timer = null;
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }
        try {
            if (!/^\d+\.\d+\.\d+/.test(OPERATOR_ID)) {
                throw new Error(OPERATOR_ID + 'is wrong');
            }
            AccountId.fromString(OPERATOR_ID);
        } catch (error) {
            await logger.error('OPERATOR_ID field in settings: ' + error.message, ['GUARDIAN_SERVICE'], null);
            return false;
            // process.exit(0);
        }
        try {
            PrivateKey.fromString(OPERATOR_KEY);
        } catch (error) {
            await logger.error('OPERATOR_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE'], null);
            return false;
        }
        try {
            if (process.env.INITIALIZATION_TOPIC_ID) {
                // if (!/^\d+\.\d+\.\d+/.test(settingsContainer.settings.INITIALIZATION_TOPIC_ID)) {
                //     throw new Error(settingsContainer.settings.INITIALIZATION_TOPIC_ID + 'is wrong');
                // }
                TopicId.fromString(process.env.INITIALIZATION_TOPIC_ID);
            }
        } catch (error) {
            await logger.error('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message, ['GUARDIAN_SERVICE'], null);
            return false;
            // process.exit(0);
        }
        try {
            if (process.env.INITIALIZATION_TOPIC_KEY) {
                PrivateKey.fromString(process.env.INITIALIZATION_TOPIC_KEY);
            }
        } catch (error) {
            await logger.error('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE'], null);
            return false;
            // process.exit(0);
        }

        return true;
    });
    let policyEngine: PolicyEngine;
    validator.setValidAction(async () => {
        if (!process.env.INITIALIZATION_TOPIC_ID && process.env.HEDERA_NET === 'localnode') {
            process.env.INITIALIZATION_TOPIC_ID = await workersHelper.addRetryableTask({
                type: WorkerTaskType.NEW_TOPIC,
                data: {
                    hederaAccountId: OPERATOR_ID,
                    hederaAccountKey: OPERATOR_KEY,
                    dryRun: false,
                    topicMemo: TopicMemo.getGlobalTopicMemo(),
                    payload: { userId: null }
                }
            }, { priority: 10 });
        }

        state.updateState(ApplicationStates.INITIALIZING);

        try {
            policyEngine = new PolicyEngine(logger);
            await policyEngine.setConnection(cn).init();
            const policyService = new PolicyEngineService(cn, logger);
            await policyService.init();
            policyService.registerListeners(logger);
            await policyEngine.init();
        } catch (error) {
            console.error(error.message);
            process.exit(0);
        }

        try {
            await setDefaultSchema();
        } catch (error) {
            console.error(error.message);
            process.exit(0);
        }

        try {
            await ipfsAPI(logger);
        } catch (error) {
            console.error(error.message);
        }

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }

        await logger.info('guardian service started', ['GUARDIAN_SERVICE'], null);

        await state.updateState(ApplicationStates.READY);

        try {
            if (process.env.SEND_KEYS_TO_VAULT?.toLowerCase() === 'true') {
                await sendKeysToVault(db.em, logger);
            }
        } catch (error) {
            console.error(error.message);
        }
    });
    validator.setInvalidAction(async () => {
        timer = setInterval(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        }, 1000)
    });
    await validator.validate();

    const workers = new Workers();
    const users = new Users();
    const retireSync = new SynchronizationTask(
        'retire-sync',
        syncRetireContracts.bind(
            {},
            dataBaseServer,
            workers,
            users
        ),
        process.env.RETIRE_CONTRACT_SYNC_MASK || '* * * * *',
        channel,
        logger
    );
    retireSync.start();
    const wipeSync = new SynchronizationTask(
        'wipe-sync',
        syncWipeContracts.bind(
            {},
            dataBaseServer,
            workers,
            users
        ),
        process.env.WIPE_CONTRACT_SYNC_MASK || '* * * * *',
        channel,
        logger
    );
    wipeSync.start();
    const policyDiscontinueTask = new SynchronizationTask(
        'policy-discontinue',
        async () => {
            const date = new Date();
            const policiesToDiscontunie = await dataBaseServer.find(Policy, {
                discontinuedDate: { $lte: date },
                status: PolicyStatus.PUBLISH
            });
            await dataBaseServer.update(Policy, null, policiesToDiscontunie.map(policy => {
                policy.status = PolicyStatus.DISCONTINUED;
                return policy;
            }));
            await Promise.all(policiesToDiscontunie.map(policy =>
                new GuardiansService().sendPolicyMessage(PolicyEvents.REFRESH_MODEL, policy.id, {})
            ));
        },
        '0 * * * *',
        channel,
        logger
    );
    policyDiscontinueTask.start(true);
    const clearPolicyCache = new SynchronizationTask(
        'clear-policy-cache-sync',
        async () => {
            const policyCaches = await DatabaseServer.getPolicyCaches();
            const now = Date.now();
            for (const policyCache of policyCaches) {
                if (policyCache.createDate.addDays(1).getTime() <= now) {
                    await DatabaseServer.clearPolicyCaches(policyCache.id);
                }
            }
        },
        process.env.CLEAR_POLICY_CACHE_INTERVAL || '0 * * * *',
        channel,
        logger
    );
    clearPolicyCache.start(true);

    initMathjs();

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
