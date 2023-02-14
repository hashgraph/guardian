import { configAPI } from '@api/config.service';
import { documentsAPI } from '@api/documents.service';
import { loaderAPI } from '@api/loader.service';
import { profileAPI } from '@api/profile.service';
import { schemaAPI, setDefaultSchema } from '@api/schema.service';
import { tokenAPI } from '@api/token.service';
import { trustChainAPI } from '@api/trust-chain.service';
import { DidDocument } from '@entity/did-document';
import { Schema } from '@entity/schema';
import { Token } from '@entity/token';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
import { IPFS } from '@helpers/ipfs';
import { demoAPI } from '@api/demo';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { Settings } from '@entity/settings';
import { Topic } from '@entity/topic';
import { PolicyEngineService } from '@policy-engine/policy-engine.service';
import {
    MessageBrokerChannel,
    ApplicationState,
    Logger,
    ExternalEventChannel,
    DataBaseHelper,
    DB_DI,
    Migration,
    COMMON_CONNECTION_CONFIG,
    SettingsContainer, ValidateConfiguration
} from '@guardian/common';
import { ApplicationStates, WorkerTaskType } from '@guardian/interfaces';
import {
    Environment,
    MessageServer,
    TopicMemo,
    TransactionLogger,
    TransactionLogLvl
} from '@hedera-modules';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { ipfsAPI } from '@api/ipfs.service';
import { Workers } from '@helpers/workers';
import { artifactAPI } from '@api/artifact.service';
import { Policy } from '@entity/policy';
import { sendKeysToVault } from '@helpers/send-keys-to-vault';
import { SynchronizationService } from '@policy-engine/multi-policy-service';
import { Contract } from '@entity/contract';
import { contractAPI } from '@api/contract.service';
import { RetireRequest } from '@entity/retire-request';
import { analyticsAPI } from '@api/analytics.service';
import { PolicyServiceChannelsContainer } from '@helpers/policy-service-channels-container';
import { PolicyEngine } from '@policy-engine/policy-engine';
import { startMetricsServer } from './utils/metrics';

export const obj = {};

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
        ensureIndexes: true,
    }),
    MessageBrokerChannel.connect('GUARDIANS_SERVICE')
]).then(async values => {
    const [_, db, cn] = values;
    DB_DI.orm = db;
    new PolicyServiceChannelsContainer().setConnection(cn);
    const channel = new MessageBrokerChannel(cn, 'guardians');
    const apiGatewayChannel = new MessageBrokerChannel(cn, 'api-gateway');
    const policyServiceChannel = new MessageBrokerChannel(cn, 'policy-service');

    new Logger().setChannel(channel);
    const state = new ApplicationState('GUARDIAN_SERVICE');
    state.setChannel(channel);
    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);

    await settingsContainer.init('OPERATOR_ID', 'OPERATOR_KEY');

    await state.updateState(ApplicationStates.STARTED);

    const { OPERATOR_ID, OPERATOR_KEY} = settingsContainer.settings;

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
        await configAPI(channel, settingsRepository, topicRepository);
        await schemaAPI(channel, apiGatewayChannel);
        await tokenAPI(channel, apiGatewayChannel, tokenRepository);
        await loaderAPI(channel, didDocumentRepository, schemaRepository);
        await profileAPI(channel, apiGatewayChannel);
        await documentsAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository, policyRepository);
        await demoAPI(channel, apiGatewayChannel, settingsRepository);
        await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
        await artifactAPI(channel);
        await contractAPI(channel, contractRepository, retireRequestRepository);
        await analyticsAPI(channel);
    } catch (error) {
        console.error(error.message);
        process.exit(0);
    }

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);
    TransactionLogger.init(channel, process.env.LOG_LEVEL as TransactionLogLvl);

    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    new Wallet().setChannel(channel);
    new Users().setChannel(channel);
    const workersHelper = new Workers();
    workersHelper.setChannel(channel);
    workersHelper.initListeners();

    const validator = new ValidateConfiguration();
    let timer = null;
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }
        try {
            if (!/^\d+\.\d+\.\d+/.test(settingsContainer.settings.OPERATOR_ID)) {
                throw new Error(settingsContainer.settings.OPERATOR_ID + 'is wrong');
            }
            AccountId.fromString(settingsContainer.settings.OPERATOR_ID);
        } catch (error) {
            await new Logger().error('OPERATOR_ID field in settings: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
            // process.exit(0);
        }
        try {
            PrivateKey.fromString(settingsContainer.settings.OPERATOR_KEY);
        } catch (error) {
            await new Logger().error('OPERATOR_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
            return false;
        }
        try {
            if (process.env.INITIALIZATION_TOPIC_KEY) {
                if (!/^\d+\.\d+\.\d+/.test(settingsContainer.settings.INITIALIZATION_TOPIC_ID)) {
                    throw new Error(settingsContainer.settings.INITIALIZATION_TOPIC_ID + 'is wrong');
                }
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
            }, 1);
        }

        try {
            const policyEngine = new PolicyEngine();
            policyEngine.setChannel(policyServiceChannel);
            const policyService = new PolicyEngineService(channel, apiGatewayChannel);
            policyService.registerListeners();
            await policyEngine.init();
            SynchronizationService.start();
        } catch (error) {
            console.error(error.message);
            process.exit(0);
        }

        state.updateState(ApplicationStates.INITIALIZING);

        try {
            await setDefaultSchema();
        } catch (error) {
            console.error(error.message);
            process.exit(0);
        }

        try {
            await ipfsAPI(new MessageBrokerChannel(cn, 'external-events'), channel);
        } catch (error) {
            console.error(error.message);
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
