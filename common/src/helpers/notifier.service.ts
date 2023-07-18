import {
    NotificationAction,
    NotificationType,
    NotifyAPI,
} from '@guardian/interfaces';
import { Injectable } from '@nestjs/common';
import { CommonVariables } from './common-variables';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';

/**
 * Notifier class
 */
@Injectable()
export class NotifierService {
    @Client({
        transport: Transport.NATS,
        options: {
            servers: [`nats://${process.env.MQ_ADDRESS}:4222`],
        },
    })
    client: ClientProxy;

    constructor() {
        new CommonVariables().setVariable('notifier', this);
    }

    private async sendMessage(subject: NotifyAPI, data: any) {
        const response = await this.client.send(subject, data).toPromise();
        return response.body;
    }

    public async get(userId: string) {
        return await this.sendMessage(NotifyAPI.GET, userId);
    }

    public async getProgress(userId: string) {
        return await this.sendMessage(NotifyAPI.GET_PROGRESS, userId);
    }

    public async read(notificationId: string) {
        return await this.sendMessage(NotifyAPI.READ, notificationId);
    }

    public async readAll(userId: string) {
        return await this.sendMessage(NotifyAPI.READ_ALL, userId);
    }

    /**
     * Create notification
     * @param userId
     * @param action
     * @param type
     * @param message
     * @param result
     * @returns Notification Identifier
     */
    public async create(
        userId: string,
        action: NotificationAction | string,
        type: NotificationType,
        message?: string,
        result?: any
    ): Promise<string> {
        return await this.sendMessage(NotifyAPI.CREATE, {
            userId,
            action,
            type,
            result,
            message,
        });
    }

    /**
     * Create progressive notification
     * @param userId
     * @param action
     * @param message
     * @param taskId
     * @returns Notification Identifier
     */
    public async createProgress(
        userId: string,
        action: string,
        message: string,
        taskId?: string
    ): Promise<string> {
        return await this.sendMessage(NotifyAPI.CREATE_PROGRESS, {
            userId,
            action,
            taskId,
            message,
        });
    }

    /**
     * Start task
     * @param token
     * @param type
     * @param key
     */
    public async updateProgress(
        id: string,
        message: string,
        progress: number
    ): Promise<string> {
        return await this.sendMessage(NotifyAPI.UPDATE_PROGRESS, {
            id,
            message,
            progress,
        });
    }

    /**
     * Start task
     * @param token
     * @param type
     * @param key
     */
    public async deleteProgress(id: string): Promise<any> {
        return await this.sendMessage(NotifyAPI.DELETE_PROGRESS, id);
    }
}
