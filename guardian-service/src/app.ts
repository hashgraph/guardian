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
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
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
    COMMON_CONNECTION_CONFIG, SettingsContainer
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
import { DatabaseServer } from '@database-modules';
import { ipfsAPI } from '@api/ipfs.service';
import { Workers } from '@helpers/workers';

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
    MessageBrokerChannel.connect('GUARDIANS_SERVICE')
]).then(async values => {
    const [_, db, cn] = values;
    DB_DI.orm = db;
    const channel = new MessageBrokerChannel(cn, 'guardians');
    const apiGatewayChannel = new MessageBrokerChannel(cn, 'api-gateway');

    new Logger().setChannel(channel);
    const state = new ApplicationState('GUARDIAN_SERVICE');
    state.setChannel(channel);
    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);
    await settingsContainer.init('OPERATOR_ID', 'OPERATOR_KEY');

    const {OPERATOR_ID, OPERATOR_KEY} = settingsContainer.settings;

    // Check configuration
    try {
        AccountId.fromString(OPERATOR_ID);
    } catch (error) {
        await new Logger().error('OPERATOR_ID field in settings: ' + error.message, ['GUARDIAN_SERVICE']);
        throw new Error('OPERATOR_ID field in settings: ' + error.message);
    }
    try {
        PrivateKey.fromString(OPERATOR_KEY);
    } catch (error) {
        await new Logger().error('OPERATOR_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw new Error('OPERATOR_KEY field in .env file: ' + error.message);
    }
    try {
        if (process.env.INITIALIZATION_TOPIC_ID) {
            TopicId.fromString(process.env.INITIALIZATION_TOPIC_ID);
        }
    } catch (error) {
        await new Logger().error('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw new Error('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message);
    }
    try {
        if (process.env.INITIALIZATION_TOPIC_KEY) {
            PrivateKey.fromString(process.env.INITIALIZATION_TOPIC_KEY);
        }
    } catch (error) {
        await new Logger().error('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw new Error('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message);
    }

    /////////////
    await state.updateState(ApplicationStates.STARTED);

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);
    TransactionLogger.setLogLevel(process.env.LOG_LEVEL as TransactionLogLvl);
    TransactionLogger.setLogFunction((types: string[], date: string, duration: string, name: string, attr?: string[]) => {
        const log = new Logger();
        const attributes = [
            ...types,
            date,
            duration,
            name,
            ...attr
        ]
        if (types[1] === 'ERROR') {
            log.error(name, attributes, 4);
        } else {
            log.info(name, attributes, 4);
        }
    });
    TransactionLogger.setVirtualFileFunction(async (date: string, id: string, file: ArrayBuffer, url:any) => {
        await DatabaseServer.setVirtualFile(id, file, url);
    });

    TransactionLogger.setVirtualTransactionFunction(async (date: string, id: string, type: string, operatorId?: string) => {
        await DatabaseServer.setVirtualTransaction(id, type, operatorId);
    });

    // SetTransactionResponseCallback(updateUserBalance(channel));

    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    new Wallet().setChannel(channel);
    new Users().setChannel(channel);
    const workersHelper = new Workers();
    workersHelper.setChannel(channel);
    workersHelper.initListeners();

    if (!process.env.INITIALIZATION_TOPIC_ID && process.env.HEDERA_NET === 'localnode') {
        process.env.INITIALIZATION_TOPIC_ID = await workersHelper.addTask({
            type: WorkerTaskType.NEW_TOPIC,
            data: {
                hederaAccountId: OPERATOR_ID,
                hederaAccountKey: OPERATOR_KEY,
                dryRun: false,
                topicMemo: TopicMemo.getGlobalTopicMemo()
            }
        }, 1);
    }

    const policyGenerator = new BlockTreeGenerator();
    const policyService = new PolicyEngineService(channel, apiGatewayChannel);
    await policyGenerator.init();
    policyService.registerListeners();

    const didDocumentRepository = new DataBaseHelper(DidDocument);
    const vcDocumentRepository = new DataBaseHelper(VcDocument);
    const vpDocumentRepository = new DataBaseHelper(VpDocument);
    const tokenRepository = new DataBaseHelper(Token);
    const schemaRepository = new DataBaseHelper(Schema);
    const settingsRepository = new DataBaseHelper(Settings);
    const topicRepository = new DataBaseHelper(Topic);

    state.updateState(ApplicationStates.INITIALIZING);

    await configAPI(channel, settingsRepository, topicRepository);
    await schemaAPI(channel, apiGatewayChannel);
    await tokenAPI(channel, apiGatewayChannel, tokenRepository);
    await loaderAPI(channel, didDocumentRepository, schemaRepository);
    await profileAPI(channel, apiGatewayChannel);
    await documentsAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await demoAPI(channel, apiGatewayChannel, settingsRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await setDefaultSchema();

    await ipfsAPI(new MessageBrokerChannel(cn, 'external-events'));

    await new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
});
