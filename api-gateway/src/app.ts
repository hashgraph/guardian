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
import { Guardians } from '@helpers/guardians';
import express from 'express';
import { Server } from 'http';
import { authorizationHelper } from '@auth/authorizationHelper';
import { IPFS } from '@helpers/ipfs';
import { policyAPI } from '@api/service/policy';
import { PolicyEngine } from '@helpers/policyEngine';
import { WebSocketsService } from '@api/service/websockets';
import { Users } from '@helpers/users';
import { Wallet } from '@helpers/wallet';
import { settingsAPI } from '@api/service/settings';
import { loggerAPI } from '@api/service/logger';
import { MessageBrokerChannel, Logger, ApiServer } from '@guardian/common';

const PORT = parseInt(process.env.PORT, 10) || 3002;

(async () => {
    const server = new ApiServer({
        port: PORT,
        name: 'API_GATEWAY',
        channelName: 'api-gateway',
        requireDB: false,
        onReady: async (_: any, channel: MessageBrokerChannel, app: express.Application, server: Server) => {

            const guardianServiceChannel = new MessageBrokerChannel(channel.connection, 'guardian')
            new Logger().setChannel(guardianServiceChannel);
            new Guardians().setChannel(guardianServiceChannel);
            new IPFS().setChannel(guardianServiceChannel);
            new PolicyEngine().setChannel(guardianServiceChannel);
            new Users().setChannel(guardianServiceChannel);
            new Wallet().setChannel(guardianServiceChannel);

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
            new Logger().info(`Started on ${PORT}`, ['API_GATEWAY']);
        }
    });

    await server.start();
})();