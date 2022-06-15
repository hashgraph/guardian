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
import { Environment, TransactionLogger, TransactionLogLvl } from '@hedera-modules';
import { Policy } from '@entity/policy';
import { MessageBrokerChannel, ApiServer, Logger, ExternalEventChannel } from '@guardian/common';
import { AggregateVC } from '@entity/aggregateDocuments';
import { BlockState } from '@entity/block-state';
import { Connection } from 'typeorm';

const PORT = parseInt(process.env.PORT, 10) || 3001;
(async () => {
    const server = new ApiServer({
        port: PORT,
        name: 'GUARDIANS_SERVICE',
        channelName: 'guardians',
        requireDB: true,
        entities: [Policy, Schema, Topic, VpDocument, VcDocument, Token, Settings, AggregateVC, ApprovalDocument, BlockState, DidDocument],
        onReady: async (db: Connection, channel: MessageBrokerChannel) => {
            IPFS.setChannel(channel);
            new Logger().setChannel(channel);
            new ExternalEventChannel().setChannel(channel);

            TransactionLogger.setLogLevel(TransactionLogLvl.NONE);
            Environment.setNetwork(process.env.HEDERA_NET)

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

            new Logger().info('guardian service started', ['GUARDIAN_SERVICE']);
        }
    });
    await server.start();
})();
