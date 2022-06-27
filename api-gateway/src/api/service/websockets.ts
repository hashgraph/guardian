import WebSocket from 'ws';
import { IncomingMessage, Server } from 'http';
import { Users } from '@helpers/users';
import { IUpdateUserInfoMessage, IUpdateUserBalanceMessage, MessageAPI } from '@guardian/interfaces';
import { IPFS } from '@helpers/ipfs';
import { Guardians } from '@helpers/guardians';
import { MessageBrokerChannel, MessageResponse, Logger } from '@guardian/common';
import { IUpdateBlockMessage, IErrorBlockMessage } from '@guardian/interfaces';

const parseMessage = function (message: any) {
    try {
        if (typeof message === 'string') {
            return JSON.parse(message);
        }
        return message;
    } catch (error) {
        return message;
    }
}

export class WebSocketsService {
    private wss: WebSocket.Server;

    constructor(
        private server: Server,
        private channel: MessageBrokerChannel
    ) {

    }

    public init(): void {
        this.wss = new WebSocket.Server({ server: this.server });
        this.registerHeartbeatAnswers();
        this.registerAuthorisation();
        this.registerMessageHandler();
        this.registerServiceStatusHandler();
        this.registerGlobalMessageHandler();
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
                    new Logger().error(error, ['API_GATEWAY', 'websocket']);
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
                    new Logger().error(error, ['API_GATEWAY', 'websocket']);
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
                }
            });
            return new MessageResponse({})
        });

        this.channel.response<IUpdateUserInfoMessage, any>('update-user-info', async (msg) => {
            console.log('update-user-info');
            this.wss.clients.forEach((client: any) => {
                try {
                    if (client.user.did === msg.user.did) {
                        client.send(JSON.stringify({
                            type: 'update-user-info-event',
                            data: msg
                        }));
                    }
                } catch (error) {
                    new Logger().error(error, ['API_GATEWAY']);
                }
            });
            return new MessageResponse({});
        });
    }

    private registerGlobalMessageHandler(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            ws.on('message', async (data: Buffer) => {
                const message = data.toString();
                if (message === 'ping') {
                    ws.send('pong');
                } else {
                    const event = parseMessage(message);
                    let type: string;
                    let _data: any;
                    if (typeof event === 'string') {
                        type = event;
                        _data = null;
                    } else {
                        type = event.type;
                        _data = event.data;
                    }
                    switch (type) {
                        case 'SET_ACCESS_TOKEN':
                        case 'UPDATE_PROFILE':
                            const token = _data;
                            if (token) {
                                ws.user = await new Users().getUserByToken(token);
                            } else {
                                ws.user = null;
                            }
                            break;
                        default:
                            break;
                    }
                }
            });
        });

        this.channel.response<IUpdateUserBalanceMessage, any>('update-user-balance', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                try {
                    if (
                        client.user &&
                        msg.user &&
                        client.user.username === msg.user.username
                    ) {
                        client.send(JSON.stringify({
                            type: 'PROFILE_BALANCE',
                            data: msg
                        }));
                    }
                } catch (error) {
                    new Logger().error(error, ['API_GATEWAY']);
                }
            });
            return new MessageResponse({});
        });
    }
}
