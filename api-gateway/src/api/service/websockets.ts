import WebSocket from 'ws';
import { IncomingMessage, Server } from 'http';
import { Users } from '@helpers/users';
import {
    MessageAPI,
    IStatus,
    ApplicationStates, GenerateUUIDv4
} from '@guardian/interfaces';
import {
    MessageResponse,
    Logger,
    NatsService,
    Singleton
} from '@guardian/common';
import { NatsConnection } from 'nats';
// import { Guardians } from '@helpers/guardians';

/**
 * WebSocketsServiceChannel
 */
@Singleton
export class WebSocketsServiceChannel extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'wss-queue-' + GenerateUUIDv4();

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'wss-queue-reply-' + GenerateUUIDv4();

    /**
     * Register listener
     * @param event
     * @param cb
     */
    registerListener(event: string, cb: Function): void {
        this.getMessages(event, cb);
    }
}

/**
 * WebSocket service class
 */
@Singleton
export class WebSocketsService {
    /**
     * Channel
     * @private
     */
    private readonly channel: WebSocketsServiceChannel;
    /**
     * WebSocket server
     * @private
     */
    private readonly wss: WebSocket.Server;

    /**
     * Known services
     * @private
     */
    private readonly knownServices: {[key: string]: ApplicationStates};

    constructor(
        private readonly server: Server,
        cn: NatsConnection
    ) {
        this.wss = new WebSocket.Server({ server: this.server });
        this.knownServices = {}
        this.channel = new WebSocketsServiceChannel();
        this.channel.setConnection(cn)
    }

    /**
     * Register all listeners
     */
    public async init(): Promise<void> {
        this.registerConnection();
        this.registerMessageHandler();
        await this.channel.init();
    }

    /**
     * Notify about task changes
     * @param taskId
     * @param statuses
     * @param completed
     * @param error
     */
    public notifyTaskProgress(taskId: string, statuses?: IStatus[], completed?: boolean, error?: any): void {
        this.wss.clients.forEach((client: any) => {
            this.send(client, {
                type: MessageAPI.UPDATE_TASK_STATUS,
                data: { taskId, statuses, completed, error }
            });
        });
    }

    /**
     * Register messages handler
     * @private
     */
    private registerMessageHandler(): void {
        let updateArray = [];

        setInterval(() => {
            const a = updateArray;
            updateArray = [];
            for (const msg of a) {
                this.wss.clients.forEach((client: any) => {
                    if (this.checkUserByDid(client, msg)) {
                        this.send(client, {
                            type: 'update-event',
                            data: msg.blocks
                        });
                    }
                });
            }
        }, 500);

        this.channel.subscribe('update-block', async (msg) => {
            updateArray.push(msg);

            return new MessageResponse({})
        });

        this.channel.subscribe('block-error', async (msg) => {
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

        this.channel.subscribe('update-user-info', async (msg) => {
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

        this.channel.subscribe('update-user-balance',  async (msg) => {
            this.wss.clients.forEach(client => {
                new Users().getUserByAccount(msg.operatorAccountId).then(user => {{
                    Object.assign(msg, {
                        user: user ? {
                            username: user.username,
                            did: user.did
                        } : null
                    });
                    if (this.checkUserByName(client, msg)) {
                        this.send(client, {
                            type: 'PROFILE_BALANCE',
                            data: msg
                        });
                    }
                }});
            });

            return new MessageResponse({});
        });

        this.channel.subscribe(MessageAPI.UPDATE_STATUS, async (msg) => {
            this.wss.clients.forEach((client: any) => {
                for (const [key, value] of Object.entries(msg)) {
                    this.knownServices[key] = value as any;
                }

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
            ws.on('message', async (data: Buffer) => {
                const message = data.toString();
                if (message === 'ping') {
                    // Register heartbeat listener
                    ws.send('pong');
                } else {
                    this.wsResponse(ws, message);
                }
            });
            ws.user = await this.getUserByUrl(req.url);
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
                    const channel = new WebSocketsServiceChannel();

                    const statuses = {
                        LOGGER_SERVICE: [],
                        GUARDIAN_SERVICE: [],
                        AUTH_SERVICE: [],
                        WORKER: [],
                        POLICY_SERVICE: []
                    };

                    const getStatuses = (): Promise<void> => {
                        channel.publish(MessageAPI.GET_STATUS);
                        return new Promise(resolve => {
                            const sub = channel.subscribe(MessageAPI.SEND_STATUS, (msg) => {
                                const { name, state } = msg;

                                if (!statuses[name]) {
                                    statuses[name] = [];
                                }
                                statuses[name].push(state);
                            })

                            setTimeout(() => {
                                sub.unsubscribe();
                                resolve();
                            }, 300);
                        })
                    }

                    await getStatuses();

                    ws.send(JSON.stringify(
                        {
                            type: MessageAPI.GET_STATUS,
                            data: statuses
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
        if(client && client.user) {
            if(msg && msg.user) {
                return (client.user.did === msg.user.did || msg.user.virtual);
            }
            return true;
        }
        return false;
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
