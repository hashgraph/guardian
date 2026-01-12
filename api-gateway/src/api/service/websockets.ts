import WebSocket, { WebSocketServer } from 'ws'
import { IncomingMessage, Server } from 'node:http';
import { ExternalProviders, GenerateUUIDv4, MessageAPI, NotifyAPI, UserRole } from '@guardian/interfaces';
import { generateNumberFromString, IAuthUser, MeecoApprovedSubmission, MessageResponse, NatsService, NotificationHelper, PinoLogger, Singleton } from '@guardian/common';
import { NatsConnection } from 'nats';
import { MeecoAuth, Users } from '#helpers';
import { Mutex } from 'async-mutex';

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
// @Injectable()
@Singleton
export class WebSocketsService {
    constructor(private readonly logger: PinoLogger) {
    }

    /**
     * Channel
     * @private
     */
    private channel: WebSocketsServiceChannel;
    /**
     * Server
     * @private
     */
    private server: Server
    /**
     * WebSocket server
     * @private
     */
    private wss: WebSocketServer;

    /**
     * Get statuses mutex
     * @private
     */
    private readonly getStatusesMutex = new Mutex();
    /**
     * Get statuses clients
     * @private
     */
    private readonly getStatusesClients: Set<WebSocket> = new Set();
    /**
     * Notification reading set
     * @private
     */
    private readonly notificationReadingMap: Set<string> = new Set();
    /**
     * Clients
     * @private
     */
    private readonly clients = new Map();

    /**
     * Set connection
     * @param cn
     */
    public setConnection(server: Server, cn: NatsConnection): WebSocketsService {
        this.server = server;
        this.wss = new WebSocketServer({ server: this.server });
        this.channel = new WebSocketsServiceChannel();
        this.channel.setConnection(cn);
        return this;
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
     * Update permissions
     * @param user
     */
    public updatePermissions(users: IAuthUser | IAuthUser[]): void {
        if (!users) {
            return;
        }

        const usersMap = new Map<string, any>();
        if (Array.isArray(users)) {
            for (const user of users) {
                usersMap.set(user.id, {
                    username: user.username,
                    did: user.did,
                    permissions: user.permissions,
                    permissionsGroup: user.permissionsGroup
                })
            }
        } else {
            usersMap.set(users.id, {
                username: users.username,
                did: users.did,
                permissions: users.permissions,
                permissionsGroup: users.permissionsGroup
            })
        }
        this.wss.clients.forEach((client: any) => {
            if (usersMap.has(client.user?.id)) {
                this.send(client, {
                    type: 'UPDATE_PERMISSIONS',
                    data: usersMap.get(client.user?.id)
                });
            }
        });
    }

    /**
     * Update notification message
     * @param notification Notification
     * @param type Message Type
     */
    public updateNotification(
        notification: any,
        type:
            | NotifyAPI.UPDATE_PROGRESS_WS
            | NotifyAPI.UPDATE_WS
            | NotifyAPI.CREATE_PROGRESS_WS
    ): void {
        this.wss.clients.forEach((client: any) => {
            if (client.user?.id === notification.userId) {
                this.send(client, {
                    type,
                    data: notification,
                });
            }
        });
    }

    /**
     * Delete notification message
     * @param param0 Notification identifier and user identifier
     * @param type Message type
     */
    public deleteNotification(
        {
            userId,
            notificationId,
        }: {
            userId: string;
            notificationId: string;
        },
        type: NotifyAPI.DELETE_PROGRESS_WS | NotifyAPI.DELETE_WS
    ) {
        this.wss.clients.forEach((client: any) => {
            if (client.user?.id === userId) {
                this.send(client, {
                    type,
                    data: notificationId,
                });
            }
        });
    }

    /**
     * Notify about task changes
     * @param taskId
     * @param statuses
     * @param completed
     * @param error
     */
    public notifyTaskProgress(task): void {
        this.wss.clients.forEach((client: any) => {
            if (client.user?.id === task.userId) {
                this.send(client, {
                    type: MessageAPI.UPDATE_TASK_STATUS,
                    data: task,
                });
            }
        });
    }

    /**
     * Get statuses handler
     * @param clients Clients
     * @returns Response
     */
    private async getStatusesHandler(
        type: MessageAPI.UPDATE_STATUS | MessageAPI.GET_STATUS
    ) {
        const channel = new WebSocketsServiceChannel();

        const statuses = {
            // LOGGER_SERVICE: [],
            GUARDIAN_SERVICE: [],
            AUTH_SERVICE: [],
            WORKER: [],
            POLICY_SERVICE: [],
            NOTIFICATION_SERVICE: [],
        };

        const getStatuses = (): Promise<void> => {
            channel.publish(MessageAPI.GET_STATUS);
            return new Promise((resolve) => {
                const sub = channel.subscribe(
                    MessageAPI.SEND_STATUS,
                    // tslint:disable-next-line:no-shadowed-variable
                    (msg) => {
                        const { name, state } = msg;

                        if (!statuses[name]) {
                            statuses[name] = [];
                        }
                        statuses[name].push(state);
                    }
                );

                setTimeout(() => {
                    sub.unsubscribe();
                    resolve();
                }, 300);
            });
        };

        await getStatuses();

        this.getStatusesClients.forEach((client: any) => {
            this.send(client, {
                type,
                data: statuses,
            });
        });
        this.getStatusesClients.clear();
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
                            data: msg.blocks,
                        });
                    }
                });
            }
        }, 500);

        this.channel.subscribe('update-record', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: 'update-record-event',
                        data: msg,
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.subscribe('update-request', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: MessageAPI.UPDATE_REQUEST_EVENT,
                        data: msg,
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.subscribe('update-restore', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                this.send(client, {
                    type: MessageAPI.UPDATE_RESTORE_EVENT,
                    data: msg,
                });
            });
            return new MessageResponse({});
        });

        this.channel.subscribe('update-test',
            async (msg: any) => {
                this.wss.clients.forEach((client: any) => {
                    if (this.checkUserByDid(client, msg)) {
                        this.send(client, {
                            type: MessageAPI.UPDATE_TEST_EVENT,
                            data: msg,
                        });
                    }
                });
                return new MessageResponse({});
            });

        this.channel.subscribe('update-block', async (msg) => {
            updateArray.push(msg);
            return new MessageResponse({});
        });

        this.channel.subscribe('block-error', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: 'error-event',
                        data: {
                            blockType: msg.blockType,
                            message: msg.message,
                        },
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.subscribe('update-user-info', async (msg) => {
            this.wss.clients.forEach((client: any) => {
                if (this.checkUserByDid(client, msg)) {
                    this.send(client, {
                        type: 'update-user-info-event',
                        data: msg,
                    });
                }
            });
            return new MessageResponse({});
        });

        this.channel.subscribe('update-user-balance', async (msg) => {
            this.wss.clients.forEach((client) => {
                new Users()
                    .getUserByAccount(msg.operatorAccountId)
                    .then((user) => {
                        {
                            Object.assign(msg, {
                                user: user
                                    ? {
                                        username: user.username,
                                        did: user.did,
                                    }
                                    : null,
                            });
                            if (this.checkUserByName(client, msg)) {
                                this.send(client, {
                                    type: 'PROFILE_BALANCE',
                                    data: msg,
                                });
                            }
                        }
                    });
            });

            return new MessageResponse({});
        });

        this.channel.subscribe(MessageAPI.UPDATE_STATUS, async (msg) => {
            this.wss.clients.forEach(
                this.getStatusesClients.add,
                this.getStatusesClients
            );
            if (!this.getStatusesMutex.isLocked()) {
                this.getStatusesMutex.runExclusive(
                    this.getStatusesHandler.bind(this, MessageAPI.UPDATE_STATUS)
                );
            }
            return new MessageResponse({});
        });

        this.channel.getMessages(NotifyAPI.UPDATE_WS, async (msg) => {
            this.updateNotification(msg.data, NotifyAPI.UPDATE_WS);
            return new MessageResponse(true);
        });
        this.channel.getMessages(NotifyAPI.DELETE_WS, async (msg) => {
            this.deleteNotification(msg.data, NotifyAPI.DELETE_WS);
            return new MessageResponse(true);
        });
        this.channel.getMessages(NotifyAPI.CREATE_PROGRESS_WS, async (msg) => {
            this.updateNotification(msg.data, NotifyAPI.CREATE_PROGRESS_WS);
            return new MessageResponse(true);
        });
        this.channel.getMessages(NotifyAPI.UPDATE_PROGRESS_WS, async (msg) => {
            this.updateNotification(msg.data, NotifyAPI.UPDATE_PROGRESS_WS);
            return new MessageResponse(true);
        });
        this.channel.getMessages(NotifyAPI.DELETE_PROGRESS_WS, async (msg) => {
            this.deleteNotification(msg.data, NotifyAPI.DELETE_PROGRESS_WS);
            return new MessageResponse(true);
        });
    }

    /**
     * Register connection
     * @private
     */
    private registerConnection(): void {
        this.wss.on('connection', async (ws: any, req: IncomingMessage) => {
            const clientId = GenerateUUIDv4();
            ws.id = clientId;
            this.clients[clientId] = ws;

            ws.on('message', async (data: Buffer) => {
                const message = data.toString();
                if (message === 'ping') {
                    // Register heartbeat listener
                    ws.send('pong');
                } else {
                    this.wsResponse(ws, message);
                }
            });
            ws.on('close', () => {
                this.clients.delete(clientId);
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
                case NotifyAPI.READ:
                    if (this.notificationReadingMap.has(data)) {
                        break;
                    }
                    this.notificationReadingMap.add(data);
                    await NotificationHelper.read(data);
                    setTimeout(
                        () => this.notificationReadingMap.delete(data),
                        1000
                    );
                    break;
                case 'MEECO_AUTH_REQUEST':
                    const meecoAuthRequestResp = await new MeecoAuth().createMeecoAuthRequest(ws);
                    ws.send(JSON.stringify({
                        type: 'MEECO_AUTH_PRESENT_VP',
                        data: meecoAuthRequestResp
                    }));
                    break;
                case 'MEECO_APPROVE_SUBMISSION':
                    const meecoSubmissionApproveResp = await new MeecoAuth().approveSubmission(
                        ws,
                        data.presentation_request_id, data.submission_id) as MeecoApprovedSubmission;

                    const meecoUser = MeecoAuth.extractUserFromApprovedMeecoToken(meecoSubmissionApproveResp)
                    // The username structure is necessary to avoid collisions - meeco doest not provide unique username
                    const userProvider = {
                        role: data.role || UserRole.STANDARD_REGISTRY as UserRole,
                        username: `${meecoUser.firstName}${meecoUser.familyName}${generateNumberFromString(meecoUser.id)
                            }`.toLowerCase().replace(/\s+/g, ''),
                        providerId: meecoUser.id,
                        provider: ExternalProviders.MEECO,
                    };
                    const guardianData = await new Users().generateNewUserTokenBasedOnExternalUserProvider(
                        userProvider
                    );

                    ws.send(JSON.stringify({
                        type: 'MEECO_APPROVE_SUBMISSION_RESPONSE',
                        data: guardianData
                    }));
                    break;
                case 'MEECO_REJECT_SUBMISSION':
                    const meecoSubmissionRejectResp = await new MeecoAuth().rejectSubmission(ws, data.presentation_request_id, data.submission_id);
                    ws.send(JSON.stringify({
                        type: 'MEECO_REJECT_SUBMISSION_RESPONSE',
                        data: meecoSubmissionRejectResp
                    }));
                    break;
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
                    this.getStatusesClients.add(ws);
                    if (!this.getStatusesMutex.isLocked()) {
                        this.getStatusesMutex.runExclusive(
                            this.getStatusesHandler.bind(
                                this,
                                MessageAPI.GET_STATUS
                            )
                        );
                    }
                    break;
                default:
                    break;
            }
        } catch (error) {
            await this.logger.error(error, ['API_GATEWAY'], null);
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
            this.logger.error(error, ['API_GATEWAY', 'websocket', 'send'], null);
        }
    }

    /**
     * Check User By Did
     * @param client
     * @param msg
     * @private
     */
    private checkUserByDid(client: any, msg: any): boolean {
        if (client && client.user) {
            if (msg && msg.user) {
                return client.user.did === msg.user.did || msg.user.virtual;
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
        return (
            client &&
            client.user &&
            msg &&
            msg.user &&
            client.user.username === msg.user.username
        );
    }

    /**
     * Parse any message to string format
     * @param message
     */
    private parseMessage(message: any): {
        /**
         * Message type
         */
        type: string;
        /**
         * Message data
         */
        data: any;
    } {
        try {
            if (typeof message === 'string') {
                const event = JSON.parse(message);
                return {
                    type: event.type,
                    data: event.data,
                };
            } else {
                return {
                    type: null,
                    data: message,
                };
            }
        } catch (error) {
            return {
                type: message,
                data: null,
            };
        }
    }
}
