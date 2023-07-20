import {
    NotificationAction,
    NotificationType,
    TaskAction,
} from '@guardian/interfaces';
import { NotificationService } from './notification.service';
import { CommonVariables } from './common-variables';

export class NotificationHelper {
    /**
     * Notifier service
     */
    private readonly notificationService: NotificationService =
        new CommonVariables().getVariable('notifier');

    private constructor(
        private _notificationIds: string[],
        private _users: string[]
    ) {}

    /**
     * Read notification
     * @param notificationId
     * @returns Notification
     */
    public static async read(notificationId: string) {
        const notifierService: NotificationService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.read(notificationId);
    }

    /**
     * Create info notification
     * @param title
     * @param message
     * @param userId
     * @returns Notification
     */
    public static async info(title: string, message: string, userId: string) {
        return await NotificationHelper.create(
            userId,
            NotificationType.INFO,
            title,
            message
        );
    }

    /**
     * Create error notification
     * @param title
     * @param message
     * @param userId
     * @returns Notification
     */
    public static async error(title: string, message: string, userId: string) {
        return await NotificationHelper.create(
            userId,
            NotificationType.ERROR,
            title,
            message
        );
    }

    /**
     * Create warn notification
     * @param title
     * @param message
     * @param userId
     * @returns Notification
     */
    public static async warn(title: string, message: string, userId: string) {
        return await NotificationHelper.create(
            userId,
            NotificationType.WARN,
            title,
            message
        );
    }

    /**
     * Create success notification
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notification
     */
    public static async success(
        title: string,
        message: string,
        userId: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await NotificationHelper.create(
            userId,
            NotificationType.SUCCESS,
            title,
            message,
            action,
            result
        );
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
    private static async create(
        userId: string,
        type: NotificationType,
        title: string,
        message: string,
        action?: NotificationAction,
        result?: any
    ) {
        const notifierService: NotificationService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.create(
            userId,
            type,
            title,
            message,
            action,
            result
        );
    }

    /**
     * Create progress
     * @param userId
     * @param action
     * @param message
     * @param taskId
     * @returns Progress
     */
    private static async createProgress(
        userId: string,
        action: NotificationAction | string,
        message: string,
        taskId?: string
    ) {
        const notifierService: NotificationService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.createProgress(
            userId,
            action,
            message,
            taskId
        );
    }

    /**
     * Initialize progress
     * @param users
     * @param action
     * @param startMessage
     * @param taskId
     * @returns Notification Helper instance with attached progress
     */
    public static async initProgress(
        users: string[],
        action: string | TaskAction,
        startMessage?: string,
        taskId?: string
    ) {
        const notifications = await Promise.all(
            users.map(
                async (userId) =>
                    await NotificationHelper.createProgress(
                        userId,
                        action,
                        startMessage,
                        taskId
                    )
            )
        );
        return new NotificationHelper(
            notifications.map((item) => item.id),
            users
        );
    }

    /**
     * Progress step
     * @param message
     * @param progress
     */
    public async step(message: string, progress: number) {
        await Promise.all(
            this._notificationIds.map(
                async (notificationId) =>
                    await this.notificationService.updateProgress(
                        notificationId,
                        message,
                        progress
                    )
            )
        );
    }

    /**
     * Finish progress
     * @param successNotification
     */
    public async finish(successNotification?: {
        title: string;
        message: string;
        action?: NotificationAction;
        result?: any;
    }) {
        for (const notificationId of this._notificationIds) {
            await this.notificationService.deleteProgress(notificationId);
        }
        if (!successNotification) {
            return;
        }
        for (const userId of this._users) {
            await NotificationHelper.success(
                successNotification.title,
                successNotification.message,
                userId,
                successNotification.action,
                successNotification.result
            );
        }
    }

    /**
     * Error progress
     * @param errorNotification
     */
    public async error(errorNotification: { title: string; message: string }) {
        for (const notificationId of this._notificationIds) {
            await this.notificationService.deleteProgress(notificationId);
        }
        if (!errorNotification) {
            return;
        }
        for (const userId of this._users) {
            await NotificationHelper.error(
                errorNotification.title,
                errorNotification.message,
                userId
            );
        }
    }
}
