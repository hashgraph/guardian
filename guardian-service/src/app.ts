import express, { Request, Response } from 'express';
import FastMQ from 'fastmq'
import { createConnection } from 'typeorm';
import { DefaultDocumentLoader, VCHelper } from 'vc-modules';
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
import { DIDDocumentLoader } from './document-loader/did-document-loader';
import { SchemaDocumentLoader } from './document-loader/vc-document-loader';
import { SchemaObjectLoader } from './document-loader/schema-loader';

const PORT = process.env.PORT || 3001;

console.log('Starting guardian-service', {
    now: new Date().toString(),
    PORT,
    DB_HOST: process.env.DB_HOST,
    DB_DATABASE: process.env.DB_DATABASE,
    BUILD_VERSION: process.env.BUILD_VERSION,
    DEPLOY_VERSION: process.env.DEPLOY_VERSION,
});

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
    const schemaObjectLoader = new SchemaObjectLoader(schemaRepository);

    vcHelper.addContext('https://localhost/schema');
    vcHelper.addDocumentLoader(defaultDocumentLoader);
    vcHelper.addDocumentLoader(schemaDocumentLoader);
    vcHelper.addDocumentLoader(didDocumentLoader);
    vcHelper.addSchemaLoader(schemaObjectLoader);
    vcHelper.buildDocumentLoader();
    // Document Loader -->

    await setDefaultSchema(schemaRepository);
    await configAPI(channel, fileConfig);
    await schemaAPI(channel, schemaRepository);
    await tokenAPI(channel, tokenRepository);
    await loaderAPI(channel, didDocumentLoader, schemaDocumentLoader, schemaObjectLoader);
    await rootAuthorityAPI(channel, configRepository, didDocumentRepository, vcDocumentRepository);
    await documentsAPI(
        channel,
        didDocumentRepository,
        vcDocumentRepository,
        vpDocumentRepository,
        vcHelper
    );

    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);

    app.get('/info', async (req: Request, res: Response) => {
        res.status(200).json({
            NAME: 'guardian-service',
            BUILD_VERSION: process.env.BUILD_VERSION,
            DEPLOY_VERSION: process.env.DEPLOY_VERSION,
            OPERATOR_ID: fileConfig.OPERATOR_ID,
            WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN
        });
    });

    app.listen(PORT, () => {
        console.log('guardian service started', PORT);
    });
});
