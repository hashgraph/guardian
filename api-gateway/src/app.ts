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
import {createServer} from 'http';
import {authorizationHelper} from '@auth/authorizationHelper';
import { IPFS } from '@helpers/ipfs';
import {policyAPI} from '@api/service/policy';
import {PolicyEngine} from '@helpers/policyEngine';
import {WebSocketsService} from '@api/service/websockets';
import { Users } from '@helpers/users';
import { Wallet } from '@helpers/wallet';
import { settingsAPI } from '@api/service/settings';
import { loggerAPI } from '@api/service/logger';
import { Logger } from 'logger-helper';

const PORT = process.env.PORT || 3002;

Promise.all([
    FastMQ.Client.connect(process.env.SERVICE_CHANNEL, 7500, process.env.MQ_ADDRESS)
]).then(async ([channel]) => {
    const app = express();
    app.use(express.json());
    app.use(express.raw({
        inflate: true,
        limit: '4096kb',
        type: 'binary/octet-stream'
    }));

    new Logger().setChannel(channel);
    new Guardians().setChannel(channel);
    new IPFS().setChannel(channel);
    new PolicyEngine().setChannel(channel);
    new Users().setChannel(channel);
    new Wallet().setChannel(channel);

    const server = createServer(app);
    new WebSocketsService(server, channel);

    ////////////////////////////////////////

    // Config routes
    app.use('/policies', authorizationHelper, policyAPI);
    app.use('/accounts/', accountAPI);
    app.use('/profiles/', authorizationHelper, profileAPI);
    app.use('/settings/', authorizationHelper, settingsAPI);
    app.use('/schemas', authorizationHelper, schemaAPI);
    app.use('/tokens', authorizationHelper, tokenAPI);
    app.use('/trustchains/', authorizationHelper, trustchainsAPI);
    app.use('/external/', externalAPI);
    app.use('/demo/', demoAPI);
    app.use('/ipfs', authorizationHelper, ipfsAPI);
    app.use('/logs', authorizationHelper, loggerAPI);
    /////////////////////////////////////////

    server.listen(PORT, () => {
        new Logger().info(`Started on ${PORT}`, ['API_GATEWAY']);
        console.log('UI service started on', PORT);
    });
});
