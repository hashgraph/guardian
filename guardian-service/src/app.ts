import FastMQ from 'fastmq'
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
import { Logger } from 'logger-helper';
import { ApplicationState, ApplicationStates } from 'interfaces';
import { Topic } from '@entity/topic';
import { PolicyEngineService } from '@policy-engine/policy-engine.service';

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
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS)
]).then(async values => {
    const [db, channel] = values;

    const state = new ApplicationState('GUARDIANS_SERVICE');
    state.setChannel(channel);
    state.updateState(ApplicationStates.STARTED);

    IPFS.setChannel(channel);
    new Logger().setChannel(channel);
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
    await profileAPI(channel, topicRepository);
    await documentsAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await demoAPI(channel, settingsRepository);
    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);
    await setDefaultSchema(schemaRepository);

    new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);
    console.log('guardian service started');

    state.updateState(ApplicationStates.READY);
});
