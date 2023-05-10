import { configAPI } from '@api/config.service';
import { documentsAPI } from '@api/documents.service';
import { loaderAPI } from '@api/loader.service';
import { profileAPI } from '@api/profile.service';
import { schemaAPI } from '@api/schema.service';
import { tokenAPI } from '@api/token.service';
import { trustChainAPI } from '@api/trust-chain.service';
import { PolicyEngineService } from '@policy-engine/policy-engine.service';
import {
    MessageBrokerChannel,
    ApplicationState,
    Logger,
    ExternalEventChannel,
    DataBaseHelper,
    Migration,
    COMMON_CONNECTION_CONFIG,
    ValidateConfiguration,
    Topic,
    VpDocument,
    VcDocument,
    Token,
    Schema,
    DidDocument,
    Settings,
    Policy,
    Contract,
    RetireRequest,
    entities,
    IPFS,
    Users,
    Environment,
    MessageServer,
    TopicMemo,
    TransactionLogger,
    TransactionLogLvl,
    Workers, LargePayloadContainer
} from '@guardian/common';
import { ApplicationStates, WorkerTaskType } from '@guardian/interfaces';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { ipfsAPI } from '@api/ipfs.service';
import { artifactAPI } from '@api/artifact.service';
import { sendKeysToVault } from '@helpers/send-keys-to-vault';
import { contractAPI } from '@api/contract.service';
import { analyticsAPI } from '@api/analytics.service';
import { PolicyServiceChannelsContainer } from '@helpers/policy-service-channels-container';
import { PolicyEngine } from '@policy-engine/policy-engine';
import { modulesAPI } from '@api/module.service';
import { GuardiansService } from '@helpers/guardians';
import { mapAPI } from '@api/map.service';
import { GridFSBucket } from 'mongodb';
import { tagsAPI } from '@api/tag.service';
import { setDefaultSchema } from '@api/helpers/schema-helper';
import { demoAPI } from '@api/demo.service';
import { SecretManager } from '@guardian/common/dist/secret-manager';
import { OldSecretManager } from '@guardian/common/dist/secret-manager/old-style/old-secret-manager';
import { themeAPI } from '@api/theme.service';
import { startMetricsServer } from './utils/metrics';

export const obj = {};

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        },
        entities
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true,
        entities
    }),
    MessageBrokerChannel.connect('GUARDIANS_SERVICE')
]).then(async values => {
    const [_, db, cn] = values;
    DataBaseHelper.orm = db;
    DataBaseHelper.gridFS = new GridFSBucket(
        db.em.getDriver().getConnection().getDb()
    );
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
    const retireRequestRepository = new DataBaseHelper(RetireRequest);

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
        await contractAPI(contractRepository, retireRequestRepository);
        await modulesAPI();
        await tagsAPI();
        await analyticsAPI();
        await mapAPI();
        await themeAPI();
    } catch (error) {
        console.error(error.message);
        process.exit(0);
    }

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    console.log(Environment);
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
    //TransactionLogger.init(channel, process.env.LOG_LEVEL as TransactionLogLvl);
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

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
