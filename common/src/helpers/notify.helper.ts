import { NotificationAction, NotificationType } from '@guardian/interfaces';
import { NotifierService } from './notifier.service';
import { CommonVariables } from './common-variables';

export class NotifierHelper {
    private readonly notifierService: NotifierService =
        new CommonVariables().getVariable('notifier');

    private constructor(
        private _notificationIds: string[],
        private _action: string,
        private _users: string[]
    ) {}

    public static async read(notificationId: string) {
        const notifierService: NotifierService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.read(notificationId);
    }

    public static async info(
        action: NotificationAction | string,
        userId: string,
        message: string
    ) {
        return await NotifierHelper.create(
            userId,
            NotificationType.INFO,
            action,
            message
        );
    }

    public static async error(
        action: NotificationAction | string,
        userId: string,
        message: string
    ) {
        return await NotifierHelper.create(
            userId,
            NotificationType.ERROR,
            action,
            message
        );
    }

    public static async warn(
        action: NotificationAction | string,
        userId: string,
        message: string
    ) {
        return await NotifierHelper.create(
            userId,
            NotificationType.WARN,
            action,
            message
        );
    }

    public static async success(
        action: NotificationAction | string,
        userId: string,
        message: string,
        result?: any
    ) {
        return await NotifierHelper.create(
            userId,
            NotificationType.SUCCESS,
            action,
            message,
            result
        );
    }

    private static async create(
        userId: string,
        type: NotificationType,
        action: NotificationAction | string,
        message: string,
        result?: any
    ) {
        const notifierService: NotifierService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.create(
            userId,
            action,
            type,
            message,
            result
        );
    }

    private static async createProgress(
        userId: string,
        action: NotificationAction | string,
        message: string,
        taskId?: string
    ) {
        const notifierService: NotifierService =
            new CommonVariables().getVariable('notifier');
        return await notifierService.createProgress(
            userId,
            action,
            message,
            taskId
        );
    }

    // public static async getExistingNotifier(notificationId: string) {
    //     const notifierService: NotifierService =
    //     new CommonVariables().getVariable('notifier');
    //     const notification = await notifierService.
    //     return new NotifierHelper(notificationId);
    // }

    public static async initNotifier(
        users: string[],
        action: NotificationAction | string,
        message?: string,
        taskId?: string
    ) {
        const notificationIds = await Promise.all(
            users.map(
                async (userId) =>
                    await NotifierHelper.createProgress(
                        userId,
                        action,
                        message,
                        taskId
                    )
            )
        );
        return new NotifierHelper(notificationIds, action, users);
    }

    public async step(message: string, progress: number) {
        return await Promise.all(
            this._notificationIds.map(
                async (notificationId) =>
                    await this.notifierService.updateProgress(
                        notificationId,
                        message,
                        progress
                    )
            )
        );
    }

    public async finish(
        action?: NotificationAction | string,
        message?: string,
        result?: any
    ) {
        for (const notificationId of this._notificationIds) {
            await this.notifierService.deleteProgress(notificationId);
            if (action) {
                for (const userId of this._users) {
                    await NotifierHelper.success(
                        action,
                        userId,
                        message,
                        result
                    );
                }
            }
        }
    }

    public async error(message: string) {
        for (const notificationId of this._notificationIds) {
            await this.notifierService.deleteProgress(notificationId);
            for (const userId of this._users) {
                await NotifierHelper.error(this._action, userId, message);
            }
        }
    }
}
