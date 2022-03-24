import FastMQ from 'fastmq'
import { createConnection, getMongoRepository } from 'typeorm';
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
import { VcHelper } from '@helpers/vcHelper';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { Policy } from '@entity/policy';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { Settings } from '@entity/settings';
import { Logger } from 'logger-helper';
import { Topic } from '@entity/topic';

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

    IPFS.setChannel(channel);
    new Logger().setChannel(channel);
    new Wallet().setChannel(channel);
    new Users().setChannel(channel);

    const policyGenerator = new BlockTreeGenerator();
    policyGenerator.setChannel(channel);
    for (let policy of await getMongoRepository(Policy).find(
        { where: { status: { $eq: 'PUBLISH' } } }
    )) {
        try {
            await policyGenerator.generate(policy.id.toString());
        } catch (e) {
            new Logger().error(e.toString(), ['GUARDIAN_SERVICE']);
            console.error(e.message);
        }
    }
    policyGenerator.registerListeners();
    channel.response('mrv-data', async (msg, res) => {
        await PolicyComponentsUtils.ReceiveExternalData(msg.payload);
        res.send();
    });

    const didDocumentRepository = db.getMongoRepository(DidDocument);
    const vcDocumentRepository = db.getMongoRepository(VcDocument);
    const vpDocumentRepository = db.getMongoRepository(VpDocument);
    const approvalDocumentRepository = db.getMongoRepository(ApprovalDocument);
    const tokenRepository = db.getMongoRepository(Token);
    const schemaRepository = db.getMongoRepository(Schema);
    const settingsRepository = db.getMongoRepository(Settings);
    const topicRepository = db.getMongoRepository(Topic);

    await setDefaultSchema(schemaRepository);
    await configAPI(channel, settingsRepository, topicRepository);
    await schemaAPI(channel, schemaRepository);
    await tokenAPI(channel, tokenRepository);
    await loaderAPI(channel, didDocumentRepository, schemaRepository);
    await profileAPI(channel, topicRepository);
    await documentsAPI(
        channel,
        didDocumentRepository,
        vcDocumentRepository,
        vpDocumentRepository,
    );
    await demoAPI(channel, settingsRepository);

    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);

    new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);
    console.log('guardian service started');
});
