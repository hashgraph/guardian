import { Notification } from '../entity/notification.entity.js';
import { Progress } from '../entity/progress.entity.js';
import {
    DatabaseServer,
    JwtServiceAuthGuard,
    JwtServicesValidator,
    MessageError,
    MessageResponse,
} from '@guardian/common';
import { NotifyAPI, OrderDirection } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
    Client,
    ClientProxy,
    MessagePattern,
    NatsRecordBuilder,
    Payload,
    Transport,
} from '@nestjs/microservices';
import process from 'node:process';
import { headers } from 'nats';

@Controller()
export class NotificationService {
    //tslint:disable-next-line:prefer-readonly
    private static deleteNotificationsInterval = null;

    constructor() {
        // Mark read notifications as old after 10 minutes
        if (NotificationService.deleteNotificationsInterval) {
            return;
        }
        NotificationService.deleteNotificationsInterval = setInterval(
            async () => {
                try {
                    const dataBaseServer = new DatabaseServer();

                    const now = new Date();
                    const updatedNotifications =
                        await dataBaseServer.update(
                            Notification,
                            {
                                updateDate: {
                                    $lt: new Date(
                                        now.getTime() - 60 * 60 * 1000
                                    ),
                                },
                                read: true,
                            },
                            {
                                old: true,
                            },
                        );
                    if (updatedNotifications) {
                        const notifications = Array.isArray(
                            updatedNotifications
                        )
                            ? updatedNotifications
                            : [updatedNotifications];
                        for (const notification of notifications) {
                            await this.deleteNotificationWS(notification);
                        }
                    }

                    const progresses = await dataBaseServer.find(Progress, {
                        updateDate: {
                            $lt: new Date(now.getTime() - 60 * 60 * 1000),
                        },
                    });
                    await dataBaseServer.remove(Progress, progresses);
                    if (progresses.length) {
                        for (const progress of progresses) {
                            await this.deleteProgressWS(progress);
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            },
            1 * 60 * 1000
        );
    }

    @Client({
        transport: Transport.NATS,
        options: {
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    })
    client: ClientProxy;

    /**
     * Send message
     * @param subject
     * @param data
     * @returns Result
     */
    private async sendMessage(subject: NotifyAPI, data: any) {
        try {
            const token = await JwtServicesValidator.sign(subject);
            const head = headers();
            head.append('serviceToken', token);
            const record = new NatsRecordBuilder(data).setHeaders(head).build();
            const response = await this.client.send(subject, record).toPromise();

            return response.body;
        } catch (error) {
            console.log(error, subject);
            throw error;
        }
    }

    /**
     * Update notification WS
     * @param notification notification
     */
    private async updateNotificationWS(notification: Notification) {
        try {
            await this.sendMessage(NotifyAPI.UPDATE_WS, notification);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Delete notification WS
     * @param param0 options
     */
    private async deleteNotificationWS({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }) {
        try {
            await this.sendMessage(NotifyAPI.DELETE_WS, {
                    userId,
                    notificationId: id,
                });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Update progress WS
     * @param progress Progress
     */
    private async updateProgressWS(progress: Progress) {
        try {
            await this.sendMessage(NotifyAPI.UPDATE_PROGRESS_WS, progress);
        } catch (error) {
            console.error(error);
        }
    }

    private async createProgressWS(progress: Progress) {
        try {
            await this.sendMessage(NotifyAPI.CREATE_PROGRESS_WS, progress);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Delete progress WS
     * @param param0 options
     */
    private async deleteProgressWS({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }) {
        try {
            await this.sendMessage(NotifyAPI.DELETE_PROGRESS_WS, {
                    notificationId: id,
                    userId,
                });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Get new notifications
     * @param userId User id
     * @returns Notifications
     */
    @MessagePattern(NotifyAPI.GET_NEW)
    async getNotifications(
        @Payload()
        userId: string
    ) {
        try {
            return new MessageResponse(
                await new DatabaseServer().find(
                    Notification,
                    {
                        userId,
                        old: false,
                    },
                    {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                    }
                )
            );
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get all notifications
     * @param msg options
     * @returns Notifications and count
     */
    @MessagePattern(NotifyAPI.GET_ALL)
    async getAll(
        @Payload()
        msg: {
            userId: string;
            pageIndex: number;
            pageSize: number;
        }
    ) {
        try {
            const { userId, pageIndex, pageSize } = msg;
            const options =
                typeof pageIndex === 'number' && typeof pageSize === 'number'
                    ? {
                          orderBy: {
                              createDate: OrderDirection.DESC,
                          },
                          limit: pageSize,
                          offset: pageIndex * pageSize,
                      }
                    : {
                          orderBy: {
                              createDate: OrderDirection.DESC,
                          },
                      };
            return new MessageResponse(
                await new DatabaseServer().findAndCount(
                    Notification,
                    {
                        userId,
                    },
                    options
                )
            );
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Delete notifications up to this point
     * @param msg options
     * @returns Deleted notifications count
     */
    @MessagePattern(NotifyAPI.DELETE_UP_TO)
    async deleteUpToThis(
        @Payload()
        msg: {
            id: string;
            userId: string;
        }
    ) {
        try {
            const dataBaseServer = new DatabaseServer();

            const notification = await dataBaseServer.findOne(Notification, msg);

            const notificationsToDelete = await dataBaseServer.find(Notification, {
                userId: msg.userId,
                $or: [
                    {
                        createDate: { $lt: notification.createDate },
                    },
                    {
                        id: notification.id,
                    },
                ],
            });

            await dataBaseServer.remove(Notification, notificationsToDelete);
            for (const notificationToDelete of notificationsToDelete) {
                await this.deleteNotificationWS(notificationToDelete);
            }
            return new MessageResponse(notificationsToDelete.length);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Read notification
     * @param notificationId Notification id
     * @returns Notification
     */
    @MessagePattern(NotifyAPI.READ)
    async read(
        @Payload()
        notificationId: string
    ) {
        try {
            const notification = await new DatabaseServer().update(
                Notification,
                {
                    id: notificationId,
                },
                {
                    read: true,
                },
            );
            if (notification) {
                await this.updateNotificationWS(notification);
            }
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Read all notifications
     * @param userId User id
     * @returns Notifications
     */
    @MessagePattern(NotifyAPI.READ_ALL)
    async readAll(
        @Payload()
        userId: string
    ) {
        try {
            await new DatabaseServer().update(
                Notification,
                {
                    userId,
                },
                {
                    read: true,
                }
            );
            return await this.getNotifications(userId);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get progresses
     * @param userId User id
     * @returns Progresses
     */
    @MessagePattern(NotifyAPI.GET_PROGRESSES)
    async getProgresses(
        @Payload()
        userId: string
    ) {
        try {
            return new MessageResponse(
                await new DatabaseServer().find(
                    Progress,
                    {
                        userId,
                    },
                    {
                        orderBy: {
                            createDate: OrderDirection.DESC,
                        },
                    }
                )
            );
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Create notification
     * @param msg Notification
     * @returns Notification
     */
    @MessagePattern(NotifyAPI.CREATE)
    async create(
        @Payload()
        msg: Partial<Notification>
    ) {
        try {
            if (!msg) {
                throw new Error('Invalid notification create message');
            }
            const notification = await new DatabaseServer().save(Notification, msg);
            await this.updateNotificationWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Uodate notification
     * @param msg Notification
     * @returns Notification
     */
    @MessagePattern(NotifyAPI.UPDATE)
    async update(
        @Payload()
        msg: Partial<Notification>
    ) {
        try {
            if (!msg) {
                throw new Error('Invalid notification update message');
            }
            const notification = await new DatabaseServer().update(Notification, null, msg);
            await this.updateNotificationWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Create progress notification
     * @param msg Progress
     * @returns Progress
     */
    @MessagePattern(NotifyAPI.CREATE_PROGRESS)
    async createProgress(
        @Payload()
        msg: Partial<Progress>
    ) {
        try {
            if (!msg) {
                throw new Error('Invalid progress create message');
            }
            const notification = await new DatabaseServer().save(Progress, msg);
            await this.createProgressWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Update progress
     * @param msg Progress
     * @returns Progress
     */
    @MessagePattern(NotifyAPI.UPDATE_PROGRESS)
    async updateProgress(
        @Payload()
        msg: Partial<Progress>
    ) {
        try {
            if (!msg) {
                throw new Error('Invalid progress update message');
            }
            const progress = Math.floor(msg.progress);
            const notification = await new DatabaseServer().update(Progress,{
                $or: [
                    {
                        id: msg.id,
                        progress: { $lt: progress },
                    },
                    {
                        id: msg.id,
                        progress,
                    },
                ],
            },
                msg);
            if (notification) {
                await this.updateProgressWS(notification);
            }
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Delete progress
     * @param id id
     * @returns Deleted status
     */
    @MessagePattern(NotifyAPI.DELETE_PROGRESS)
    async deleteProgress(
        @Payload()
        id: string
    ) {
        try {
            const dataBaseServer = new DatabaseServer();

            if (!id) {
                throw new Error('Invalid notification id');
            }
            const notification = await dataBaseServer.findOne(Progress, {
                id,
            });

            if (notification) {
                await dataBaseServer.remove(Progress, notification);
                await this.deleteProgressWS(notification);
            }

            return new MessageResponse(!!notification);
        } catch (error) {
            return new MessageError(error);
        }
    }
}

/**
 * Notification module
 */
@Module({
    controllers: [NotificationService],
    providers: [
        {
          provide: APP_GUARD,
          useFactory: () => new JwtServiceAuthGuard(Object.values(NotifyAPI)),
        },
      ],
})
export class NotificationModule {}
