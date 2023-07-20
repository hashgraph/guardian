import { Notification } from '@entity/notification.entity';
import { Progress } from '@entity/progress.entity';
import {
    DataBaseHelper,
    InboundMessageIdentityDeserializer,
    MessageError,
    MessageResponse,
    OutboundResponseIdentitySerializer,
    ZipCodec,
} from '@guardian/common';
import { NotifyAPI, OrderDirection } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import {
    Client,
    ClientProxy,
    ClientsModule,
    MessagePattern,
    Payload,
    Transport,
} from '@nestjs/microservices';
import process from 'process';

@Controller()
export class NotificationService {
    //tslint:disable-next-line:prefer-readonly
    private static deleteNotificationsInterval = null;

    constructor() {
        // Mark read notifications as old after 10 minutes
        if (NotificationService.deleteNotificationsInterval) {
            return;
        }
        setInterval(() => {
            const dbHelper = new DataBaseHelper(Notification);
            const now = new Date();
            dbHelper.update(
                {
                    old: true,
                },
                {
                    updateDate: { $lt: new Date(now.getTime() + 1 * 60000) },
                    read: true,
                }
            ).then((updatedNotifications) => {
                if (!updatedNotifications) {
                    return;
                }
                const notifications = Array.isArray(updatedNotifications)
                    ? updatedNotifications
                    : [updatedNotifications];
                notifications.forEach(this.deleteNotificationWS.bind(this));
            }).catch();
        }, 1000 * 60 * 1);
    }

    @Client({
        transport: Transport.NATS,
        options: {
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    })
    client: ClientProxy;

    private async updateNotificationWS(notification: Notification) {
        await this.client.send(NotifyAPI.UPDATE_WS, notification).toPromise();
    }

    private async deleteNotificationWS({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }) {
        this.client
            .send(NotifyAPI.DELETE_WS, {
                userId,
                notificationId: id,
            })
            .subscribe();
    }

    private async updateProgressWS(notification: Progress) {
        await this.client
            .send(NotifyAPI.UPDATE_PROGRESS_WS, notification)
            .toPromise();
    }

    private async deleteProgressWS({
        id,
        userId,
    }: {
        id: string;
        userId: string;
    }) {
        await this.client
            .send(NotifyAPI.DELETE_PROGRESS_WS, {
                notificationId: id,
                userId,
            })
            .toPromise();
    }

    /**
     * Get notifications
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.GET_NEW)
    async getNotifications(
        @Payload()
        userId: string
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        try {
            return new MessageResponse(
                await notificationRepo.find(
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
     * Get notifications
     *
     * @param msg Notification
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
        const notificationRepo = new DataBaseHelper(Notification);
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
        try {
            return new MessageResponse(
                await notificationRepo.findAndCount(
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

    @MessagePattern(NotifyAPI.DELETE_UP_TO)
    async deleteUpToThis(
        @Payload()
        msg: {
            id: string;
            userId: string;
        }
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        const notification = await notificationRepo.findOne(msg);
        const notificationsToDelete = await notificationRepo.find({
            $or: [
                {
                    createDate: { $lt: notification.createDate },
                },
                {
                    id: notification.id,
                },
            ],
        });
        await notificationRepo.remove(notificationsToDelete);
        for (const notificationToDelete of notificationsToDelete) {
            await this.deleteNotificationWS(notificationToDelete);
        }
        try {
            return new MessageResponse(notificationsToDelete.length);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get notifications
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.READ)
    async read(
        @Payload()
        notificationId: string
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        try {
            const notification = await notificationRepo.update(
                {
                    read: true,
                },
                {
                    id: notificationId,
                }
            );
            if (notification) {
                this.updateNotificationWS(notification);
            }
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get notifications
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.READ_ALL)
    async readAll(
        @Payload()
        userId: string
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        try {
            await notificationRepo.update(
                {
                    read: true,
                },
                {
                    userId,
                }
            );
            return await this.getNotifications(userId);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Get notifications
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.GET_PROGRESSES)
    async getProgresses(
        @Payload()
        userId: string
    ) {
        const notificationRepo = new DataBaseHelper(Progress);
        try {
            return new MessageResponse(
                await notificationRepo.find(
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
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.CREATE)
    async create(
        @Payload()
        msg: Partial<Notification>
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        try {
            console.log(msg);
            if (!msg) {
                throw new Error('Invalid notification create message');
            }
            const notification = await notificationRepo.save(msg);
            await this.updateNotificationWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Create notification
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.UPDATE)
    async update(
        @Payload()
        msg: Partial<Notification>
    ) {
        const notificationRepo = new DataBaseHelper(Notification);
        try {
            if (!msg) {
                throw new Error('Invalid notification update message');
            }
            const notification = await notificationRepo.update(msg);
            await this.updateNotificationWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Create progress notification
     *
     * @param msg
     */
    @MessagePattern(NotifyAPI.CREATE_PROGRESS)
    async createProgress(
        @Payload()
        msg: Partial<Progress>
    ) {
        const notificationRepo = new DataBaseHelper(Progress);
        try {
            if (!msg) {
                throw new Error('Invalid progress create message');
            }
            const notification = await notificationRepo.save(msg);
            await this.updateProgressWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Create progress notification
     *
     * @param msg
     */
    @MessagePattern(NotifyAPI.UPDATE_PROGRESS)
    async updateProgress(
        @Payload()
        msg: Partial<Progress>
    ) {
        console.log(msg);
        const notificationRepo = new DataBaseHelper(Progress);
        try {
            if (!msg) {
                throw new Error('Invalid progress update message');
            }
            const notification = await notificationRepo.update(msg);
            await this.updateProgressWS(notification);
            return new MessageResponse(notification);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * Delete progress notification
     *
     * @param msg
     */
    @MessagePattern(NotifyAPI.DELETE_PROGRESS)
    async deleteProgress(
        @Payload()
        id: string
    ) {
        const notificationRepo = new DataBaseHelper(Progress);
        try {
            if (!id) {
                throw new Error('Invalid notification id');
            }
            const notification = await notificationRepo.findOne({
                id,
            });
            await notificationRepo.remove(notification);
            await this.deleteProgressWS(notification);
            return new MessageResponse(!!notification);
        } catch (error) {
            return new MessageError(error);
        }
    }
}

/**
 * Logger module
 */
@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'NOTIFICATION',
                transport: Transport.NATS,
                options: {
                    servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
                    queue: 'notification-service',
                    serializer: new OutboundResponseIdentitySerializer(),
                    deserializer: new InboundMessageIdentityDeserializer(),
                    codec: ZipCodec(),
                },
            },
        ]),
    ],
    controllers: [NotificationService],
})
export class NotificationModule {}
