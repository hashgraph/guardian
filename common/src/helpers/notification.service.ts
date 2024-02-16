import {
    NotificationAction,
    NotificationType,
    NotifyAPI,
} from '@guardian/interfaces';
import { Injectable } from '@nestjs/common';
import { CommonVariables } from './common-variables';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';

/**
 * Notification service
 */
@Injectable()
export class NotificationService {
    /**
     * Client
     */
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

    /**
     * Send message
     * @param subject
     * @param data
     * @returns Result
     */
    private async sendMessage(subject: NotifyAPI, data: any) {
        try {
            const response = await this.client.send(subject, data).toPromise();
            return response.body;
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    /**
     * Get all notifications
     * @param userId
     * @param pageIndex
     * @param pageSize
     * @returns Notifications
     */
    public async all(userId: string, pageIndex?: number, pageSize?: number) {
        return await this.sendMessage(NotifyAPI.GET_ALL, {
            userId,
            pageIndex,
            pageSize,
        });
    }

    /**
     * Delete up to notification
     * @param userId
     * @param notificationId
     * @returns Deleted count
     */
    public async deleteUpTo(userId: string, notificationId: string) {
        return await this.sendMessage(NotifyAPI.DELETE_UP_TO, {
            id: notificationId,
            userId,
        });
    }

    /**
     * Get new notifications
     * @param userId
     * @returns Notifications
     */
    public async getNewNotifications(userId: string) {
        return await this.sendMessage(NotifyAPI.GET_NEW, userId);
    }

    /**
     * Get progresses
     * @param userId
     * @returns Progresses
     */
    public async getProgresses(userId: string) {
        return await this.sendMessage(NotifyAPI.GET_PROGRESSES, userId);
    }

    /**
     * Read notification
     * @param notificationId
     * @returns Notification
     */
    public async read(notificationId: string) {
        return await this.sendMessage(NotifyAPI.READ, notificationId);
    }

    /**
     * Read all notifications
     * @param userId
     * @returns Notifications
     */
    public async readAll(userId: string) {
        return await this.sendMessage(NotifyAPI.READ_ALL, userId);
    }

    /**
     * Create notification
     * @param userId
     * @param type
     * @param title
     * @param message
     * @param action
     * @param result
     * @returns Notification
     */
    public async create(
        userId: string,
        type: NotificationType,
        title: string,
        message?: string,
        action?: NotificationAction | string,
        result?: any
    ): Promise<any> {
        return await this.sendMessage(NotifyAPI.CREATE, {
            userId,
            action,
            type,
            result,
            message,
            title,
        });
    }

    /**
     * Create progress
     * @param userId
     * @param action
     * @param message
     * @param taskId
     * @returns Progress
     */
    public async createProgress(
        userId: string,
        action: string,
        message: string,
        taskId?: string
    ): Promise<any> {
        return await this.sendMessage(NotifyAPI.CREATE_PROGRESS, {
            userId,
            action,
            taskId,
            message,
        });
    }

    /**
     * Update progress
     * @param progressId
     * @param message
     * @param progress
     * @returns Notification
     */
    public async updateProgress(
        progressId: string,
        message: string,
        progress: number
    ): Promise<any> {
        return await this.sendMessage(NotifyAPI.UPDATE_PROGRESS, {
            id: progressId,
            message,
            progress,
        });
    }

    /**
     * Delete progress
     * @param progressId
     */
    public async deleteProgress(progressId: string): Promise<any> {
        return await this.sendMessage(NotifyAPI.DELETE_PROGRESS, progressId);
    }
}
