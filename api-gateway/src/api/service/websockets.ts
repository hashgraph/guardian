import WebSocket from 'ws';
import { IncomingMessage, Server } from 'http';
import { Users } from '@helpers/users';
import { IUpdateUserInfoMessage, IUpdateUserBalanceMessage, MessageAPI, IUpdateBlockMessage, IErrorBlockMessage } from '@guardian/interfaces';
import { IPFS } from '@helpers/ipfs';
import { Guardians } from '@helpers/guardians';
import { MessageBrokerChannel, MessageResponse, Logger } from '@guardian/common';

/**
 * WebSocket service class
 */
export class WebSocketsService {
    /**
     * WebSocket server
     * @private
     */
    private readonly wss: WebSocket.Server;

    constructor(
        private readonly server: Server,
        private readonly channel: MessageBrokerChannel
    ) {
        this.wss = new WebSocket.Server({ server: this.server });
    }

    /**
     * Register all listeners
     */
    public init(): void {
        this.registerConnection();
        this.registerMessageHandler();
    }

    /**
     * Register messages handler
     * @private
     */
    private registerMessageHandler(): void {
        this.channel.response<IUpdateBlockMessage, any>('update-block', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                this.send(client, {
                    type: 'update-event',
                    data: msg.uuid
                });
            });
            return new MessageResponse({})
        });

        this.channel.response<IErrorBlockMessage, any>('block-error', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: 'error-event',
                        data: {
                            blockType: msg.blockType,
                            message: msg.message
                        }
                    });
                }
            });
            return new MessageResponse({})
        });

        this.channel.response<IUpdateUserInfoMessage, any>('update-user-info', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: 'update-user-info-event',
                        data: msg
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.response<IUpdateUserBalanceMessage, any>('update-user-balance', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByName(client, msg)) {
                    this.send(client, {
                        type: 'PROFILE_BALANCE',
                        data: msg
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.response(MessageAPI.UPDATE_STATUS, async (msg) => {
            this.wss.clients.forEach((client: any) => {
                this.send(client, {
                    type: MessageAPI.UPDATE_STATUS,
                    data: msg
                });
            });
            return new MessageResponse({})
        });
    }

    /**
     * Register connection
     * @private
     */
    private registerConnection(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            ws.user = await this.getUserByUrl(req.url);
            ws.on('message', async (data: Buffer) => {
                const message = data.toString();
                if (message === 'ping') {
                    // Register heartbeat listener
                    ws.send('pong');
                } else {
                    this.wsResponse(ws, message);
                }
            });
        });
    }

    /**
     * Response
     * @param ws
     * @param message
     * @private
     */
    private async wsResponse(ws: any, message: string) {
        try {
            const { type, data } = this.parseMessage(message);
            switch (type) {
                case 'SET_ACCESS_TOKEN':
                case 'UPDATE_PROFILE':
                    const token = data;
                    if (token) {
                        ws.user = await new Users().getUserByToken(token);
                    } else {
                        ws.user = null;
                    }
                    break;
                case MessageAPI.GET_STATUS:
                    const logger = new Logger();
                    const guardians = new Guardians();
                    const ipfs = new IPFS();
                    const auth = new Users();

                    const [
                        LOGGER_SERVICE,
                        GUARDIAN_SERVICE,
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
                                LOGGER_SERVICE,
                                GUARDIAN_SERVICE,
                                IPFS_CLIENT,
                                AUTH_SERVICE
                            }
                        }
                    ));
                    break;
                default:
                    break;
            }
        }
        catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
        }
    }

    /**
     * Send message
     * @param ws
     * @param message
     * @private
     */
    private send(ws: any, message: any) {
        try {
            ws.send(JSON.stringify(message));
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY', 'websocket', 'send']);
        }
    }

    /**
     * Get User by url
     * @param url
     * @private
     */
    private async getUserByUrl(url: string): Promise<any> {
        try {
            const params = url.split('?')[1];
            const token = new URLSearchParams(params).get('token');
            if (token) {
                return await new Users().getUserByToken(token);
            }
            return null;
        } catch (error) {
            new Logger().error(error, ['API_GATEWAY']);
            return null;
        }
    }

    /**
     * Check User By Did
     * @param client
     * @param msg
     * @private
     */
    private checkUserByDid(client: any, msg: any): boolean {
        return client && client.user && msg && msg.user && (client.user.did === msg.user.did);
    }

    /**
     * Get User by url
     * @param client
     * @param msg
     * @private
     */
    private checkUserByName(client: any, msg: any): boolean {
        return client && client.user && msg && msg.user && (client.user.username === msg.user.username);
    }

    /**
     * Parse any message to string format
     * @param message
     */
    private parseMessage(message: any): {
        /**
         * Message type
         */
        type: string,
        /**
         * Message data
         */
        data: any
    } {
        try {
            if (typeof message === 'string') {
                const event = JSON.parse(message);
                return {
                    type: event.type,
                    data: event.data
                }
            } else {
                return {
                    type: null,
                    data: message
                }
            }
        } catch (error) {
            return {
                type: message,
                data: null
            }
        }
    }
}
