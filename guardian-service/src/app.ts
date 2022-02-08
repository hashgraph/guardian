import express from 'express';
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
import { ContextDocumentLoader } from './document-loader/context-loader';
import { VCSchemaLoader } from './document-loader/vc-schema-loader';
import { SubjectSchemaLoader } from './document-loader/subject-schema-loader';
import { IPFS } from '@helpers/ipfs';

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

    IPFS.setChannel(channel);

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
    const schemaDocumentLoader = new ContextDocumentLoader('https://localhost/schema', schemaRepository);
    const didDocumentLoader = new DIDDocumentLoader(didDocumentRepository);
    const vcSchemaObjectLoader = new VCSchemaLoader(schemaRepository, "https://ipfs.io/ipfs/");
    const subjectSchemaObjectLoader = new SubjectSchemaLoader(schemaRepository, "https://ipfs.io/ipfs/");

    vcHelper.addContext('https://localhost/schema');
    vcHelper.addDocumentLoader(defaultDocumentLoader);
    vcHelper.addDocumentLoader(schemaDocumentLoader);
    vcHelper.addDocumentLoader(didDocumentLoader);
    vcHelper.addSchemaLoader(vcSchemaObjectLoader);
    vcHelper.addSchemaLoader(subjectSchemaObjectLoader);
    vcHelper.buildDocumentLoader();
    // Document Loader -->

    await setDefaultSchema(schemaRepository);
    await configAPI(channel, fileConfig);
    await schemaAPI(channel, schemaRepository, configRepository);
    await tokenAPI(channel, tokenRepository);
    await loaderAPI(channel, didDocumentRepository, schemaRepository);
    await rootAuthorityAPI(channel, configRepository);
    await documentsAPI(
        channel,
        didDocumentRepository,
        vcDocumentRepository,
        vpDocumentRepository,
        vcHelper
    );

    await approveAPI(channel, approvalDocumentRepository);
    await trustChainAPI(channel, didDocumentRepository, vcDocumentRepository, vpDocumentRepository);

    app.listen(PORT, () => {
        console.log('guardian service started', PORT);
    });
});
