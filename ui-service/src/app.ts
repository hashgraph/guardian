import {fixtures} from '@api/fixtures';
import {
    accountAPI,
    auditAPI,
    frontendService,
    infoAPI,
    otherAPI,
    profileAPI,
    rootAPI,
    schemaAPI,
    tokenAPI
} from '@api/service';
import {Policy} from '@entity/policy';
import {Guardians} from '@helpers/guardians';
import {BlockTreeGenerator} from '@policy-engine/block-tree-generator';
import express from 'express';
import FastMQ from 'fastmq';
import {createServer} from 'http';
import {createConnection, getMongoRepository} from 'typeorm';
import WebSocket from 'ws';
import {authorizationHelper} from './auth/authorizationHelper';
import {StateContainer} from '@policy-engine/state-container';
import {swaggerAPI} from '@api/service/swagger';
import {importExportAPI} from '@policy-engine/import-export';

const PORT = process.env.PORT || 3002;

console.log('Starting ui-service', {
    now: new Date().toString(),
    PORT,
    DB_HOST: process.env.DB_HOST,
    DB_DATABASE: process.env.DB_DATABASE,
    BUILD_VERSION: process.env.BUILD_VERSION,
    DEPLOY_VERSION: process.env.DEPLOY_VERSION,
    OPERATOR_ID: process.env.OPERATOR_ID,
    MRV_ADDRESS: process.env.MRV_ADDRESS,
    SERVICE_CHANNEL: process.env.SERVICE_CHANNEL,
    WEB3_STORAGE_TOKEN: process.env.WEB3_STORAGE_TOKEN
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
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS)
]).then(async ([db, channel]) => {
    // Fill test data
    await fixtures();

    // if (!(await getMongoRepository(Policy).find()).length) {
    //     await BlockTreeGenerator.GenerateMock();
    // }
    ///////////////////////////////////////

    // Init services
    const app = express();
    app.use(express.json());
    app.use(express.raw({
        inflate: true,
        limit: '4096kb',
        type: 'binary/octet-stream'
    }));

    new Guardians().setChannel(channel);
    new Guardians().registerMRVReceiver(async (data) => {
        console.log(data);
        await StateContainer.ReceiveExternalData(data);
    });

    const server = createServer(app);
    const policyGenerator = new BlockTreeGenerator();
    policyGenerator.registerWssServer(new WebSocket.Server({server}));
    for (let policy of await getMongoRepository(Policy).find(
        {where: {status: {$eq: 'PUBLISH'}}}
    )) {
        await policyGenerator.generate(policy.id);
    }
    ////////////////////////////////////////

    // Config routes
    app.use('/policy/', authorizationHelper, policyGenerator.getRouter());
    app.use('/api/account/', accountAPI);
    app.use('/api/profile/', authorizationHelper, profileAPI);
    app.use('/api/schema', authorizationHelper, schemaAPI);
    app.use('/api/tokens', authorizationHelper, tokenAPI);
    app.use('/api/info', infoAPI);
    app.use('/api/package', importExportAPI);
    app.use('/api/', authorizationHelper, rootAPI, auditAPI, otherAPI);
    app.use('/api-docs/', swaggerAPI);
    app.use('/', frontendService);
    /////////////////////////////////////////

    server.listen(PORT, () => {
        console.log('UI service started on', PORT);
    });
});
