import { Notification } from '@entity/notification.entity';
import { ProgressiveNotification } from '@entity/progressive-notification.entity';
import {
    DataBaseHelper,
    InboundMessageIdentityDeserializer,
    MessageError,
    MessageResponse,
    OutboundResponseIdentitySerializer,
    ZipCodec,
} from '@guardian/common';
import { NotifyAPI, OrderDirection, sortObjectsArray } from '@guardian/interfaces';
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
export class NotifyService {
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

    private async deleteNotificationWS(notificationId: string, userId: string) {
        this.client
            .send(NotifyAPI.DELETE_WS, {
                userId,
                notificationId,
            })
            .subscribe();
    }

    private async updateProgressWS(notification: ProgressiveNotification) {
        await this.client
            .send(NotifyAPI.UPDATE_PROGRESS_WS, notification)
            .toPromise();
    }

    private async deleteProgressWS(notificationId: string, userId: string) {
        await this.client
            .send(NotifyAPI.DELETE_PROGRESS_WS, {
                userId,
                notificationId,
            })
            .toPromise();
    }

    /**
     * Get notifications
     *
     * @param msg Notification
     */
    @MessagePattern(NotifyAPI.GET)
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
    @MessagePattern(NotifyAPI.GET_PROGRESS)
    async getProgresses(
        @Payload()
        userId: string
    ) {
        const notificationRepo = new DataBaseHelper(ProgressiveNotification);
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
            return new MessageResponse(notification.id);
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
            return new MessageResponse(notification.id);
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
        msg: Partial<ProgressiveNotification>
    ) {
        const notificationRepo = new DataBaseHelper(ProgressiveNotification);
        try {
            if (!msg) {
                throw new Error('Invalid progress create message');
            }
            const notification = await notificationRepo.save(msg);
            await this.updateProgressWS(notification);
            return new MessageResponse(notification.id);
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
        msg: Partial<ProgressiveNotification>
    ) {
        const notificationRepo = new DataBaseHelper(ProgressiveNotification);
        try {
            if (!msg) {
                throw new Error('Invalid progress update message');
            }
            const notification = await notificationRepo.update(msg);
            await this.updateProgressWS(notification);
            return new MessageResponse(notification.id);
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
        const notificationRepo = new DataBaseHelper(ProgressiveNotification);
        try {
            if (!id) {
                throw new Error('Invalid notification id');
            }
            const notification = await notificationRepo.findOne({
                id,
            });
            const deletedCount = await notificationRepo.delete({
                id,
            });
            await this.deleteProgressWS(id, notification.userId);
            return new MessageResponse(deletedCount);
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
                name: 'NOTIFY',
                transport: Transport.NATS,
                options: {
                    servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
                    queue: 'notify-service',
                    serializer: new OutboundResponseIdentitySerializer(),
                    deserializer: new InboundMessageIdentityDeserializer(),
                    codec: ZipCodec(),
                },
            },
        ]),
    ],
    controllers: [NotifyService],
})
export class NotifyModule {}
