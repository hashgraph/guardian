import { createConnection } from 'typeorm';
import { approveAPI } from '@api/approve.service';
import { configAPI } from '@api/config.service';
import { documentsAPI } from '@api/documents.service';
import { loaderAPI } from '@api/loader.service';
import { profileAPI } from '@api/profile.service';
import { schemaAPI, setDefaultSchema } from '@api/schema.service';
import { tokenAPI } from '@api/token.service';
import { trustChainAPI } from '@api/trust-chain.service';
import { ApprovalDocument } from '@entity/approval-document';
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
import { MessageBrokerChannel, ApplicationState, Logger, ExternalEventChannel } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { Environment, MessageServer, TransactionLogger, TransactionLogLvl } from '@hedera-modules';
import { AccountId, PrivateKey, TopicId } from '@hashgraph/sdk';

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: true,
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    MessageBrokerChannel.connect('GUARDIANS_SERVICE')
]).then(async values => {
    const [db, cn] = values;
    const channel = new MessageBrokerChannel(cn, 'guardians');

    new Logger().setChannel(channel);
    const state = new ApplicationState('GUARDIAN_SERVICE');
    state.setChannel(channel);

    // Check configuration
    if(!process.env.OPERATOR_ID || process.env.OPERATOR_ID.length < 5) {
        await new Logger().error('You need to fill OPERATOR_ID field in .env file', ['GUARDIAN_SERVICE']);
        throw ('You need to fill OPERATOR_ID field in .env file');
    }
    if(!process.env.OPERATOR_KEY || process.env.OPERATOR_KEY.length < 5) {
        await new Logger().error('You need to fill OPERATOR_KEY field in .env file', ['GUARDIAN_SERVICE']);
        throw ('You need to fill OPERATOR_KEY field in .env file');
    }
    try {
        AccountId.fromString(process.env.OPERATOR_ID);
    } catch (error) {
        await new Logger().error('OPERATOR_ID field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw ('OPERATOR_ID field in .env file: ' + error.message);
    }
    try {
        PrivateKey.fromString(process.env.OPERATOR_KEY);
    } catch (error) {
        await new Logger().error('OPERATOR_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw ('OPERATOR_KEY field in .env file: ' + error.message);
    }
    try {
        if(process.env.INITIALIZATION_TOPIC_ID) {
            TopicId.fromString(process.env.INITIALIZATION_TOPIC_ID);
        }
    } catch (error) {
        await new Logger().error('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw ('INITIALIZATION_TOPIC_ID field in .env file: ' + error.message);
    }
    try {
        if(process.env.INITIALIZATION_TOPIC_KEY) {
            PrivateKey.fromString(process.env.INITIALIZATION_TOPIC_KEY);
        }
    } catch (error) {
        await new Logger().error('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message, ['GUARDIAN_SERVICE']);
        throw ('INITIALIZATION_TOPIC_KEY field in .env file: ' + error.message);
    }
    /////////////
    await state.updateState(ApplicationStates.STARTED);

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
        if (types[1] == 'ERROR') {
            log.error(name, attributes, 4);
        } else {
            log.info(name, attributes, 4);
        }
    })

    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    new Wallet().setChannel(channel);
    new Users().setChannel(channel);

    const policyGenerator = new BlockTreeGenerator();
    const policyService = new PolicyEngineService(channel);
    await policyGenerator.init();
    policyService.registerListeners();

    const didDocumentRepository = db.getMongoRepository(DidDocument);
    const vcDocumentRepository = db.getMongoRepository(VcDocument);
    const vpDocumentRepository = db.getMongoRepository(VpDocument);
    const approvalDocumentRepository = db.getMongoRepository(ApprovalDocument);
    const tokenRepository = db.getMongoRepository(Token);
    const schemaRepository = db.getMongoRepository(Schema);
    const settingsRepository = db.getMongoRepository(Settings);
    const topicRepository = db.getMongoRepository(Topic);

    state.updateState(ApplicationStates.INITIALIZING);

    await configAPI(channel, settingsRepository, topicRepository);
    await schemaAPI(channel, schemaRepository);
    await tokenAPI(channel, tokenRepository);
    await loaderAPI(channel, didDocumentRepository, schemaRepository);
    await profileAPI(channel);
    await documentsAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await demoAPI(channel, settingsRepository);
    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await setDefaultSchema();

    await new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
});
