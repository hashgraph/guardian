import express from 'express';
import FastMQ from 'fastmq'

import { createConnection } from 'typeorm';
import { DefaultDocumentLoader, HederaListener, ListenerType, VCHelper } from 'vc-modules';

import { approveAPI } from '@api/approve.service';
import { configAPI, readConfig } from '@api/config.service';
import { documentsAPI } from '@api/documents.service';
import { loaderAPI } from '@api/loader.service';
import { rootAuthorityAPI } from '@api/root-authority.service';
import { schemaAPI, setDefaultSchema } from '@api/schema.service';
import { tokenAPI } from '@api/token.service';
import { trustChainAPI } from '@api/trust-chain.service';
import { ApprovalDocument } from '@entity/approval-document';
import { DidDocument } from '@entity/did-document';
import { RootConfig } from '@entity/root-config';
import { Schema } from '@entity/schema';
import { Token } from '@entity/token';
import { VcDocument } from '@entity/vc-document';
import { VpDocument } from '@entity/vp-document';
// import { DIDSubscriber } from '@subscribers/did-subscriber';
// import { VCSubscriber } from '@subscribers/vc-subscriber';
// import { VerifySubscriber } from '@subscribers/verify-subscribe';

import { DIDDocumentLoader } from './document-loader/did-document-loader';
import { SchemaDocumentLoader } from './document-loader/vc-document-loader';

const PORT = process.env.PORT || 3001;

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
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS),
    readConfig()
]).then(async values => {
    const [db, channel, fileConfig] = values;
    const app = express();

    const didDocumentRepository = db.getMongoRepository(DidDocument);
    const vcDocumentRepository = db.getMongoRepository(VcDocument);
    const vpDocumentRepository = db.getMongoRepository(VpDocument);
    const approvalDocumentRepository = db.getMongoRepository(ApprovalDocument);
    const tokenRepository = db.getMongoRepository(Token);
    const configRepository = db.getMongoRepository(RootConfig);
    const schemaRepository = db.getMongoRepository(Schema);

    // <-- Document Loader
    const vcHelper = new VCHelper()
    const defaultDocumentLoader = new DefaultDocumentLoader();
    const schemaDocumentLoader = new SchemaDocumentLoader('https://localhost/schema', schemaRepository);
    const didDocumentLoader = new DIDDocumentLoader(didDocumentRepository);
    vcHelper.addContext('https://localhost/schema');
    vcHelper.addDocumentLoader(defaultDocumentLoader);
    vcHelper.addDocumentLoader(schemaDocumentLoader);
    vcHelper.addDocumentLoader(didDocumentLoader);
    vcHelper.buildDocumentLoader();
    // Document Loader -->

    // <-- Listeners
    // const verifySubscriber = new VerifySubscriber(vcDocumentRepository, vcHelper);
    // const vcSubscriber = new VCSubscriber(vcDocumentRepository);
    // const didSubscriber = new DIDSubscriber(didDocumentRepository);
    // const hederaListener = new HederaListener();
    // hederaListener.addListener(ListenerType.VC, fileConfig['VC_TOPIC_ID'], 20000);
    // hederaListener.addListener(ListenerType.DID, fileConfig['DID_TOPIC_ID'], 20000);
    // hederaListener.subscribe([ListenerType.VC, ListenerType.MRV], null, vcSubscriber);
    // hederaListener.subscribe([ListenerType.DID], null, didSubscriber);
    // Listeners -->

    await setDefaultSchema(schemaRepository);
    await configAPI(channel, fileConfig);
    await schemaAPI(channel, schemaRepository);
    await tokenAPI(channel, tokenRepository);
    await loaderAPI(channel, didDocumentLoader, schemaDocumentLoader);
    await rootAuthorityAPI(channel,
        configRepository, didDocumentRepository, vcDocumentRepository/*, hederaListener*/
    );
    await documentsAPI(
        channel,
        didDocumentRepository,
        vcDocumentRepository,
        vpDocumentRepository,
        vcHelper
    );

    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);

    // channel.response('get-listeners', async (msg, res) => {
    //     try {
    //         const listeners = hederaListener.getListeners().map(e => {
    //             return {
    //                 topicId: e.topicId,
    //                 type: e.type,
    //                 status: e.status,
    //                 startTime: e.startTime
    //             }
    //         });
    //         res.send(listeners);
    //     } catch (e) {
    //         res.send(null);
    //     }
    // });

    // channel.response('reboot-listeners', async (msg, res) => {
    //     try {
    //         hederaListener.removeListeners();
    //         const rootConfig = await configRepository.find();
    //         for (let i = 0; i < rootConfig.length; i++) {
    //             const element = rootConfig[i];
    //             hederaListener.addListener(ListenerType.VC, element.vcTopic, 10000);
    //             hederaListener.addListener(ListenerType.DID, element.didTopic, 10000);
    //         }
    //     } catch (e) {
    //         res.send(null);
    //     }
    // });

    app.listen(PORT, () => {
        console.log('guardian service started', PORT);
    });
});
