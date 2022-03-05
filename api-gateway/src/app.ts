import {fixtures} from '@api/fixtures';
import {
    accountAPI,
    trustchainsAPI,
    demoAPI,
    profileAPI,
    schemaAPI,
    tokenAPI,
    externalAPI,
    ipfsAPI
} from '@api/service';
import {Guardians} from '@helpers/guardians';
import express from 'express';
import FastMQ from 'fastmq';
import {createServer, IncomingMessage} from 'http';
import {createConnection} from 'typeorm';
import WebSocket from 'ws';
import {authorizationHelper} from '@auth/authorizationHelper';
import { IPFS } from '@helpers/ipfs';
import {policyAPI} from '@api/service/policy';
import {PolicyEngine} from '@helpers/policyEngine';
import {AuthenticatedWebSocket, IAuthUser} from '@auth/auth.interface';
import {verify} from 'jsonwebtoken';
import {WebSocketsService} from '@api/service/websockets';

const PORT = process.env.PORT || 3002;

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: process.env.ENVIRONMENT !== 'production',
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

    // Init services
    const app = express();
    app.use(express.json());
    app.use(express.raw({
        inflate: true,
        limit: '4096kb',
        type: 'binary/octet-stream'
    }));

    new Guardians().setChannel(channel);
    new IPFS().setChannel(channel);
    new PolicyEngine().setChannel(channel);

    const server = createServer(app);
    new WebSocketsService(server, channel);

    ////////////////////////////////////////

    // Config routes
    app.use('/policies', authorizationHelper, policyAPI);
    app.use('/accounts/', accountAPI);
    app.use('/profile/', authorizationHelper, profileAPI);
    app.use('/schemas', authorizationHelper, schemaAPI);
    app.use('/tokens', authorizationHelper, tokenAPI);
    app.use('/trustchains/', authorizationHelper, trustchainsAPI);
    app.use('/external/', externalAPI);
    app.use('/demo/', demoAPI);
    app.use('/ipfs', authorizationHelper, ipfsAPI);
    /////////////////////////////////////////

    server.listen(PORT, () => {
        console.log('UI service started on', PORT);
    });
});
