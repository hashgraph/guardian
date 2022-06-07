import WebSocket from 'ws';
import { IncomingMessage, Server } from 'http';
import { Users } from '@helpers/users';
import { Logger } from '@guardian/logger-helper';
import { MessageAPI } from '@guardian/interfaces';
import { IPFS } from '@helpers/ipfs';
import { Guardians } from '@helpers/guardians';
import { MessageBrokerChannel, MessageResponse } from '@guardian/common';
import { IUpdateBlockMessage, IErrorBlockMessage } from '@guardian/interfaces';
export class WebSocketsService {
    private wss: WebSocket.Server;

    constructor(
        private server: Server,
        private channel: MessageBrokerChannel
    ) {
        this.wss = new WebSocket.Server({ server });
        this.registerHeartbeatAnswers();
        this.registerAuthorisation();
        this.registerMessageHandler();
        this.registerServiceStatusHandler();
    }

    private registerHeartbeatAnswers(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            ws.on('message', (data: Buffer) => {
                switch (data.toString()) {
                    case 'ping':
                        ws.send('pong');
                        break;
                }
            });
        });
    }

    private registerAuthorisation(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            try {
                const params = req.url.split('?')[1];
                const token = new URLSearchParams(params).get('token');
                if (token) {
                    ws.user = await new Users().getUserByToken(token);
                }
            } catch (error) {
                new Logger().error(error, ['API_GATEWAY']);
                console.error(error.message);
            }
        });
    }

    private registerServiceStatusHandler(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            ws.on('message', async (data: Buffer) => {
                switch (data.toString()) {
                    case MessageAPI.GET_STATUS:
                        const logger = new Logger();
                        const guardians = new Guardians();
                        const ipfs = new IPFS();
                        const auth = new Users();
                        try {
                            const [
                                LOGGER_SERVICE,
                                GUARDIANS_SERVICE,
                                IPFS_CLIENT,
                                AUTH_SERVICE
                            ] = await Promise.all([
                                logger.getStatus(),
                                guardians.getStatus(),
                                ipfs.getStatus(),
                                auth.getStatus()
                            ]);

                            ws.send(JSON.stringify(
                                {
                                    type: MessageAPI.GET_STATUS,
                                    data: {
                                        LOGGER_SERVICE: LOGGER_SERVICE,
                                        GUARDIAN_SERVICE: GUARDIANS_SERVICE,
                                        IPFS_CLIENT: IPFS_CLIENT,
                                        AUTH_SERVICE: AUTH_SERVICE
                                    }
                                }
                            ));
                        }
                        catch (error) {
                            logger.error(error, ['API_GATEWAY'])
                        }
                        break;
                }
            });
        });

        this.channel.response(MessageAPI.UPDATE_STATUS, async (msg) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    client.send(JSON.stringify({
                        type: MessageAPI.UPDATE_STATUS,
                        data: msg
                    }));
                } catch (error) {
                    console.error('WS Error', error);
                }
            });
            return new MessageResponse({})
        });
    }

    private registerMessageHandler(): void {
        this.channel.response<IUpdateBlockMessage, any>('update-block', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    client.send(JSON.stringify({
                        type: 'update-event',
                        data: msg.uuid
                    }));
                } catch (error) {
                    console.error('WS Error', error);
                }
            });
            return new MessageResponse({})
        });

        this.channel.response<IErrorBlockMessage, any>('block-error', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    if (client.user.did === msg.user.did) {
                        client.send(JSON.stringify({
                            type: 'error-event',
                            data: {
                                blockType: msg.blockType,
                                message: msg.message
                            }
                        }));
                    }
                } catch (error) {
                    new Logger().error(error, ['API_GATEWAY']);
                    console.error('WS Error', error);
                }
            });
            return new MessageResponse({})
        })
    }
}
