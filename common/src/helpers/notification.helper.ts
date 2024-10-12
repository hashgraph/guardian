import {
    NotificationAction,
    NotificationType,
    TaskAction,
} from '@guardian/interfaces';
import { NotificationService } from './notification.service.js';
import { CommonVariables } from './common-variables.js';

export class NotificationHelper {
    /**
     * Users
     */
    private readonly _users: string[];

    /**
     * Notifications
     */
    private readonly _notifications: string[];

    /**
     * Notifier service
     */
    private readonly notificationService: NotificationService =
        new CommonVariables().getVariable('notifier');

    private constructor(users: string[] = [], notifications: string[] = []) {
        this._users = [...new Set(users.filter((user) => !!user))];
        this._notifications = [...new Set(notifications.filter(
            (notification) => !!notification
        ))];
    }

    /**
     * Initialize
     * @param users Users
     * @returns Notification Helper
     */
    public static init(users: string[]) {
        return new NotificationHelper(users || []);
    }

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
     * @param action
     * @param result
     * @returns Notification
     */
    public static async info(
        title: string,
        message: string,
        userId: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await NotificationHelper.create(
            userId,
            NotificationType.INFO,
            title,
            message,
            action,
            result
        );
    }

    /**
     * Create info notifications
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notifications
     */
    public async info(
        title: string,
        message: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await Promise.all(
            this._users.map((userId) =>
                NotificationHelper.create(
                    userId,
                    NotificationType.INFO,
                    title,
                    message,
                    action,
                    result
                )
            )
        );
    }

    /**
     * Create error notification
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notification
     */
    public static async error(
        title: string,
        message: string,
        userId: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await NotificationHelper.create(
            userId,
            NotificationType.ERROR,
            title,
            message,
            action,
            result
        );
    }

    /**
     * Create error notifications
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notifications
     */
    public async error(
        title: string,
        message: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await Promise.all(
            this._users.map((userId) =>
                NotificationHelper.create(
                    userId,
                    NotificationType.ERROR,
                    title,
                    message,
                    action,
                    result
                )
            )
        );
    }

    /**
     * Create warn notification
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notification
     */
    public static async warn(
        title: string,
        message: string,
        userId: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await NotificationHelper.create(
            userId,
            NotificationType.WARN,
            title,
            message,
            action,
            result
        );
    }

    /**
     * Create warn notifications
     * @param title
     * @param message
     * @param userId
     * @param action
     * @param result
     * @returns Notifications
     */
    public async warn(
        title: string,
        message: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await Promise.all(
            this._users.map((userId) =>
                NotificationHelper.create(
                    userId,
                    NotificationType.WARN,
                    title,
                    message,
                    action,
                    result
                )
            )
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
     * Create success notifications
     * @param title
     * @param message
     * @param action
     * @param result
     * @returns Notifications
     */
    public async success(
        title: string,
        message: string,
        action?: NotificationAction,
        result?: any
    ) {
        return await Promise.all(
            this._users.map((userId) =>
                NotificationHelper.create(
                    userId,
                    NotificationType.SUCCESS,
                    title,
                    message,
                    action,
                    result
                )
            )
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
     * @param action
     * @param startMessage
     * @param taskId
     * @returns Notification Helper instance with attached progress
     */
    public async progress(
        action: string | TaskAction,
        startMessage?: string,
        taskId?: string
    ) {
        const notifications = await Promise.all(
            this._users.map(
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
            this._users,
            notifications.filter((item) => item).map((item) => item.id)
        );
    }

    /**
     * Progress step
     * @param message
     * @param progress
     */
    public async step(message: string, progress: number) {
        await Promise.all(
            this._notifications.map(
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
        await this.stop();
        if (!successNotification) {
            return;
        }
        await this.success(
            successNotification.title,
            successNotification.message,
            successNotification.action,
            successNotification.result
        );
    }

    /**
     * Error progress
     * @param errorNotification
     */
    public async stop(errorNotification?: {
        title: string;
        message: string;
        action?: NotificationAction;
        result?: any;
    }) {
        await Promise.all(
            this._notifications.map((notificationId) =>
                this.notificationService.deleteProgress(notificationId)
            )
        );
        if (!errorNotification) {
            return;
        }
        await this.error(
            errorNotification.title,
            errorNotification.message,
            errorNotification.action,
            errorNotification.result
        );
    }
}
