import {fixtures} from '@api/fixtures';
import {
    accountAPI,
    trustchainsAPI,
    frontendService,
    demoAPI,
    infoAPI,
    profileAPI,
    schemaAPI,
    tokenAPI,
    externalAPI,
    ipfsAPI
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
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';
import {swaggerAPI} from '@api/service/swagger';
import {importExportAPI} from '@policy-engine/import-export';
import { IPFS } from '@helpers/ipfs';

const PORT = process.env.PORT || 3002;
const API_VERSION = 'v1';

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
    MQ_ADDRESS: process.env.MQ_ADDRESS,
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
        await PolicyComponentsStuff.ReceiveExternalData(data);
    });

    new IPFS().setChannel(channel);

    const server = createServer(app);
    const policyGenerator = new BlockTreeGenerator();
    policyGenerator.registerWssServer(new WebSocket.Server({server}));
    for (let policy of await getMongoRepository(Policy).find(
        {where: {status: {$eq: 'PUBLISH'}}}
    )) {
        await policyGenerator.generate(policy.id.toString());
    }
    ////////////////////////////////////////

    // Config routes
    //Old - left incase they are hooked up - probably need to be removed
    app.use('/policy/', authorizationHelper, policyGenerator.getRouter());
    app.use('/api/account/', accountAPI);
    app.use('/api/profile/', authorizationHelper, profileAPI);
    app.use('/api/schema', authorizationHelper, schemaAPI);
    app.use('/api/tokens', authorizationHelper, tokenAPI);
    app.use('/api/info', infoAPI);
    app.use('/api/package', importExportAPI);
    app.use('/api-docs/', swaggerAPI);

    //New - these are from upstream
    app.use(`/api/${API_VERSION}/policies`, authorizationHelper, policyGenerator.getRouter());
    app.use(`/api/${API_VERSION}/policies`, authorizationHelper, importExportAPI);
    app.use(`/api/${API_VERSION}/accounts/`, accountAPI);
    app.use(`/api/${API_VERSION}/profile/`, authorizationHelper, profileAPI);
    app.use(`/api/${API_VERSION}/schemas`, authorizationHelper, schemaAPI);
    app.use(`/api/${API_VERSION}/tokens`, authorizationHelper, tokenAPI);
    app.use(`/api/${API_VERSION}/trustchains/`, authorizationHelper, trustchainsAPI);
    app.use(`/api/${API_VERSION}/external/`, externalAPI);
    app.use(`/api/${API_VERSION}/demo/`, demoAPI);
    app.use(`/api/${API_VERSION}/ipfs`, authorizationHelper, ipfsAPI);
    app.use(`/api-docs/${API_VERSION}`, swaggerAPI);
    app.use('/', frontendService);
    /////////////////////////////////////////

    server.listen(PORT, () => {
        console.log('UI service started on', PORT);
    });
});
