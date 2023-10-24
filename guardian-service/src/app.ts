import { configAPI } from '@api/config.service';
import { documentsAPI } from '@api/documents.service';
import { loaderAPI } from '@api/loader.service';
import { profileAPI } from '@api/profile.service';
import { schemaAPI } from '@api/schema.service';
import { tokenAPI } from '@api/token.service';
import { trustChainAPI } from '@api/trust-chain.service';
import { PolicyEngineService } from '@policy-engine/policy-engine.service';
import {
    ApplicationState,
    Branding,
    COMMON_CONNECTION_CONFIG,
    Contract,
    DataBaseHelper,
    DidDocument,
    entities,
    Environment,
    ExternalEventChannel,
    IPFS,
    LargePayloadContainer,
    Logger,
    MessageBrokerChannel,
    MessageServer,
    Migration,
    OldSecretManager,
    Policy,
    RetirePool,
    RetireRequest,
    Schema,
    SecretManager,
    Settings,
    Token,
    Topic,
    TopicMemo,
    TransactionLogger,
    TransactionLogLvl,
    Users,
    ValidateConfiguration,
    VcDocument,
    VpDocument,
    WiperRequest,
    Workers
} from '@guardian/common';
import { ApplicationStates, WorkerTaskType } from '@guardian/interfaces';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
import { ipfsAPI } from '@api/ipfs.service';
import { artifactAPI } from '@api/artifact.service';
import { sendKeysToVault } from '@helpers/send-keys-to-vault';
import { contractAPI, syncRetireContracts, syncWipeContracts } from '@api/contract.service';
import { PolicyServiceChannelsContainer } from '@helpers/policy-service-channels-container';
import { PolicyEngine } from '@policy-engine/policy-engine';
import { modulesAPI } from '@api/module.service';
import { toolsAPI } from '@api/tool.service';
import { GuardiansService } from '@helpers/guardians';
import { mapAPI } from '@api/map.service';
import { tagsAPI } from '@api/tag.service';
import { setDefaultSchema } from '@api/helpers/schema-helper';
import { demoAPI } from '@api/demo.service';
import { themeAPI } from '@api/theme.service';
import { brandingAPI } from '@api/branding.service';
import { wizardAPI } from '@api/wizard.service';
import { startMetricsServer } from './utils/metrics';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import process from 'process';
import { AppModule } from './app.module';
import { analyticsAPI } from '@api/analytics.service';
import { GridFSBucket } from 'mongodb';
import { suggestionsAPI } from '@api/suggestions.service';
import { SynchronizationTask } from '@helpers/synchronization-task';

export const obj = {};

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
        driverOptions: {
            useUnifiedTopology: true
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
        'v2-16-0'
    ]),
    MessageBrokerChannel.connect('GUARDIANS_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            queue: 'guardian-service',
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        },
    })
]).then(async values => {
    const [db, cn, app] = values;

    app.listen();

    DataBaseHelper.orm = db;
    DataBaseHelper.gridFS = new GridFSBucket(db.em.getDriver().getConnection().getDb());
    new PolicyServiceChannelsContainer().setConnection(cn);
    new TransactionLogger().initialization(
        cn,
        process.env.TRANSACTION_LOG_LEVEL as TransactionLogLvl
    );
    new GuardiansService().setConnection(cn).init();
    const channel = new MessageBrokerChannel(cn, 'guardians');

    await new Logger().setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('GUARDIAN_SERVICE').setConnection(cn).init();
    const secretManager = SecretManager.New();
    await new OldSecretManager().setConnection(cn).init();
    let { OPERATOR_ID, OPERATOR_KEY } = await secretManager.getSecrets('keys/operator');
    if (!OPERATOR_ID) {
        OPERATOR_ID = process.env.OPERATOR_ID;
        OPERATOR_KEY = process.env.OPERATOR_KEY;
        await secretManager.setSecrets('keys/operator', {
            OPERATOR_ID,
            OPERATOR_KEY
        })

    }

    await state.updateState(ApplicationStates.STARTED);

    const didDocumentRepository = new DataBaseHelper(DidDocument);
    const vcDocumentRepository = new DataBaseHelper(VcDocument);
    const vpDocumentRepository = new DataBaseHelper(VpDocument);
    const tokenRepository = new DataBaseHelper(Token);
    const schemaRepository = new DataBaseHelper(Schema);
    const settingsRepository = new DataBaseHelper(Settings);
    const topicRepository = new DataBaseHelper(Topic);
    const policyRepository = new DataBaseHelper(Policy);
    const contractRepository = new DataBaseHelper(Contract);
    const wipeRequestRepository = new DataBaseHelper(WiperRequest);
    const retirePoolRepository = new DataBaseHelper(RetirePool);
    const retireRequestRepository = new DataBaseHelper(RetireRequest);
    const brandingRepository = new DataBaseHelper(Branding);

    try {
        await configAPI(settingsRepository, topicRepository);
        await schemaAPI();
        await tokenAPI(tokenRepository);
        await loaderAPI(didDocumentRepository, schemaRepository);
        await profileAPI();
        await documentsAPI(didDocumentRepository, vcDocumentRepository, vpDocumentRepository, policyRepository);
        await demoAPI(settingsRepository);
        await trustChainAPI(didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
        await artifactAPI();
        await contractAPI(contractRepository,
            wipeRequestRepository,
            retirePoolRepository,
            retireRequestRepository,
            vcDocumentRepository
        );
        await modulesAPI();
        await toolsAPI();
        await tagsAPI();
        await analyticsAPI();
        await mapAPI();
        await themeAPI();
        await wizardAPI();
        await brandingAPI(brandingRepository);
        await suggestionsAPI()
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
            await new Logger().warn(
                'HEDERA_CUSTOM_NODES field in settings: ' + error.message,
                ['GUARDIAN_SERVICE']
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
            await new Logger().warn(
                'HEDERA_CUSTOM_MIRROR_NODES field in settings: ' +
                error.message,
                ['GUARDIAN_SERVICE']
            );
            console.warn(error);
        }
    }
    MessageServer.setLang(process.env.MESSAGE_LANG);
    // TransactionLogger.init(channel, process.env.LOG_LEVEL as TransactionLogLvl);
    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    await new Users().setConnection(cn).init();
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
            await new Logger().error('OPERATOR_ID field in settings: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
            // process.exit(0);
        }
        try {
            PrivateKey.fromString(OPERATOR_KEY);
        } catch (error) {
            await new Logger().error('OPERATOR_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
        }
        try {
            if (process.env.INITIALIZATION_TOPIC_KEY) {
                // if (!/^\d+\.\d+\.\d+/.test(settingsContainer.settings.INITIALIZATION_TOPIC_ID)) {
                //     throw new Error(settingsContainer.settings.INITIALIZATION_TOPIC_ID + 'is wrong');
                // }
                TopicId.fromString(process.env.INITIALIZATION_TOPIC_ID);
            }
        } catch (error) {
            await new Logger().error('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
            // process.exit(0);
        }
        try {
            if (process.env.INITIALIZATION_TOPIC_KEY) {
                PrivateKey.fromString(process.env.INITIALIZATION_TOPIC_KEY);
            }
        } catch (error) {
            await new Logger().error('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
            // process.exit(0);
        }

        return true;
    });
    validator.setValidAction(async () => {
        if (!process.env.INITIALIZATION_TOPIC_ID && process.env.HEDERA_NET === 'localnode') {
            process.env.INITIALIZATION_TOPIC_ID = await workersHelper.addRetryableTask({
                type: WorkerTaskType.NEW_TOPIC,
                data: {
                    hederaAccountId: OPERATOR_ID,
                    hederaAccountKey: OPERATOR_KEY,
                    dryRun: false,
                    topicMemo: TopicMemo.getGlobalTopicMemo()
                }
            }, 10);
        }

        state.updateState(ApplicationStates.INITIALIZING);

        try {
            const policyEngine = new PolicyEngine();
            await policyEngine.setConnection(cn).init();
            const policyService = new PolicyEngineService(cn);
            await policyService.init();
            policyService.registerListeners();
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
            await ipfsAPI();
        } catch (error) {
            console.error(error.message);
        }

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }

        await new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);

        await state.updateState(ApplicationStates.READY);

        try {
            if (process.env.SEND_KEYS_TO_VAULT?.toLowerCase() === 'true') {
                await sendKeysToVault(db.em);
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
            contractRepository,
            retirePoolRepository,
            retireRequestRepository,
            workers,
            users
        ),
        process.env.RETIRE_CONTRACT_SYNC_MASK || '* * * * *',
        channel
    );
    retireSync.start();
    const wipeSync = new SynchronizationTask(
        'wipe-sync',
        syncWipeContracts.bind(
            {},
            contractRepository,
            wipeRequestRepository,
            retirePoolRepository,
            workers,
            users
        ),
        process.env.WIPE_CONTRACT_SYNC_MASK || '* * * * *',
        channel
    );
    wipeSync.start();

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
