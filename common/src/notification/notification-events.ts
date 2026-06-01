import { MessageAPI, NotificationAction, StatusType, TaskAction, } from '@guardian/interfaces';
import { INotificationInfo } from './notification-info.interface.js';
import { NatsService } from '../mq/index.js';
import { NotificationHelper } from './notification-helper.js';

export const notificationActionMap = new Map<TaskAction, NotificationAction>([
    [TaskAction.CREATE_POLICY, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.WIZARD_CREATE_POLICY, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.PUBLISH_POLICY, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.IMPORT_POLICY_FILE, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.IMPORT_POLICY_MESSAGE, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.IMPORT_TOOL_FILE, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.IMPORT_TOOL_MESSAGE, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.PUBLISH_SCHEMA, NotificationAction.SCHEMAS_PAGE],
    [TaskAction.IMPORT_SCHEMA_FILE, NotificationAction.SCHEMAS_PAGE],
    [TaskAction.IMPORT_SCHEMA_MESSAGE, NotificationAction.SCHEMAS_PAGE],
    [TaskAction.CREATE_SCHEMA, NotificationAction.SCHEMAS_PAGE],
    [TaskAction.CREATE_TOKEN, NotificationAction.TOKENS_PAGE],
    [TaskAction.UPDATE_TOKEN, NotificationAction.TOKENS_PAGE],
    [TaskAction.DELETE_TOKEN, NotificationAction.TOKENS_PAGE],
    [TaskAction.DELETE_TOKENS, NotificationAction.TOKENS_PAGE],
    [TaskAction.DELETE_POLICY, NotificationAction.POLICIES_PAGE],
    [TaskAction.DELETE_POLICIES, NotificationAction.POLICIES_PAGE],
    [TaskAction.CLONE_POLICY, NotificationAction.POLICY_CONFIGURATION],
    [TaskAction.PUBLISH_POLICY_LABEL, NotificationAction.POLICY_LABEL_PAGE],
]);

export const taskResultTitleMap = new Map<TaskAction, string>([
    [TaskAction.CREATE_POLICY, 'Policy created'],
    [TaskAction.CREATE_TOOL, 'Tool created'],
    [TaskAction.WIZARD_CREATE_POLICY, 'Policy created'],
    [TaskAction.PUBLISH_POLICY, 'Policy published'],
    [TaskAction.IMPORT_POLICY_FILE, 'Policy imported'],
    [TaskAction.IMPORT_POLICY_MESSAGE, 'Policy imported'],
    [TaskAction.IMPORT_TOOL_FILE, 'Tool imported'],
    [TaskAction.IMPORT_TOOL_MESSAGE, 'Tool imported'],
    [TaskAction.PUBLISH_SCHEMA, 'Schema published'],
    [TaskAction.IMPORT_SCHEMA_FILE, 'Schema imported'],
    [TaskAction.IMPORT_SCHEMA_MESSAGE, 'Schema imported'],
    [TaskAction.CREATE_SCHEMA, 'Schema created'],
    [TaskAction.CREATE_TOKEN, 'Token created'],
    [TaskAction.UPDATE_TOKEN, 'Token updated'],
    [TaskAction.DELETE_TOKEN, 'Token deleted'],
    [TaskAction.DELETE_POLICY, 'Policy deleted'],
    [TaskAction.CLONE_POLICY, 'Policy cloned'],
    [TaskAction.CONNECT_USER, 'User connected'],
    [TaskAction.CREATE_RANDOM_KEY, 'Random key created'],
    [TaskAction.FREEZE_TOKEN, 'Token frozen'],
    [TaskAction.UNFREEZE_TOKEN, 'Token unfrozen'],
    [TaskAction.GRANT_KYC, 'KYC granted'],
    [TaskAction.REVOKE_KYC, 'KYC revoked'],
    [TaskAction.ASSOCIATE_TOKEN, 'Token associated'],
    [TaskAction.DISSOCIATE_TOKEN, 'Token dissociated'],
    [TaskAction.RESTORE_USER_PROFILE, 'Profile restored'],
    [TaskAction.MIGRATE_DATA, 'Data migrated'],
    [TaskAction.PUBLISH_POLICY_LABEL, 'Label published'],
]);

export function getNotificationResultMessage(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.CREATE_POLICY:
            return `Policy ${result} created`;
        case TaskAction.PUBLISH_POLICY:
            return `Policy ${result.policyId} published`;
        case TaskAction.PUBLISH_POLICY_LABEL:
            return `Policy ${result.id} published`;
        case TaskAction.IMPORT_POLICY_FILE:
        case TaskAction.IMPORT_POLICY_MESSAGE:
            return `Policy ${result.policyId} imported`;
        case TaskAction.IMPORT_TOOL_FILE:
        case TaskAction.IMPORT_TOOL_MESSAGE:
            return `Tool ${result.toolId} imported`;
        case TaskAction.CREATE_SCHEMA:
            return `Schema ${result} created`;
        case TaskAction.ASSOCIATE_TOKEN:
            return `${result.tokenName} associated`;
        case TaskAction.DISSOCIATE_TOKEN:
            return `${result.tokenName} dissociated`;
        case TaskAction.FREEZE_TOKEN:
            return `${result.tokenName} frozen`;
        case TaskAction.UNFREEZE_TOKEN:
            return `${result.tokenName} unfrozen`;
        case TaskAction.GRANT_KYC:
            return `KYC granted for ${result.tokenName}`;
        case TaskAction.REVOKE_KYC:
            return `KYC revoked for ${result.tokenName}`;
        case TaskAction.CONNECT_USER:
            return `You are connected`;
        case TaskAction.RESTORE_USER_PROFILE:
            return `Your profile restored`;
        default:
            return 'Operation completed';
    }
}

export function getNotificationResultTitle(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.PUBLISH_POLICY:
            if (!result.isValid) {
                return;
            }
        default:
            return taskResultTitleMap.get(action);
    }
}

export function getNotificationResult(action: TaskAction, result: any) {
    if (!result) {
        return;
    }
    switch (action) {
        case TaskAction.CREATE_POLICY:
            return result; //id
        case TaskAction.WIZARD_CREATE_POLICY:
            return result.policyId;
        case TaskAction.PUBLISH_POLICY:
            return result.policyId;
        case TaskAction.IMPORT_POLICY_FILE:
            return result.policyId;
        case TaskAction.IMPORT_POLICY_MESSAGE:
            return result.policyId;
        case TaskAction.PUBLISH_SCHEMA:
            return result; //id
        case TaskAction.IMPORT_SCHEMA_FILE:
            return;
        case TaskAction.IMPORT_SCHEMA_MESSAGE:
            return;
        case TaskAction.CREATE_SCHEMA:
            return result; //id
        case TaskAction.PREVIEW_SCHEMA_MESSAGE:
            return;
        case TaskAction.CREATE_RANDOM_KEY:
            return;
        case TaskAction.CONNECT_USER:
            return result; //did
        case TaskAction.PREVIEW_POLICY_MESSAGE:
            return;
        case TaskAction.CREATE_TOKEN:
            return result.id;
        case TaskAction.UPDATE_TOKEN:
            return result.id;
        case TaskAction.DELETE_TOKEN:
            return result; //true
        case TaskAction.FREEZE_TOKEN:
            return result.id;
        case TaskAction.UNFREEZE_TOKEN:
            return result.id;
        case TaskAction.ASSOCIATE_TOKEN:
            return result.status;
        case TaskAction.DISSOCIATE_TOKEN:
            return result.status;
        case TaskAction.GRANT_KYC:
            return result.id;
        case TaskAction.REVOKE_KYC:
            return result.id;
        case TaskAction.DELETE_POLICY:
            return result; //true
        case TaskAction.CLONE_POLICY:
            return result; //id
        case TaskAction.RESTORE_USER_PROFILE:
            return result; //did
        case TaskAction.GET_USER_TOPICS:
            return;
        case TaskAction.CREATE_TOOL:
            return result; //id
        case TaskAction.PUBLISH_TOOL:
            return result.errors;
        case TaskAction.IMPORT_TOOL_FILE:
            return result.toolId;
        case TaskAction.IMPORT_TOOL_MESSAGE:
            return result.toolId;
        case TaskAction.MIGRATE_DATA:
            return result; //Errors
        case TaskAction.PUBLISH_POLICY_LABEL:
            return result.id;
        case TaskAction.APPROVE_EXTERNAL_POLICY:
            return result.id;
        case TaskAction.REJECT_EXTERNAL_POLICY:
            return result.id;
        default:
            return result;
    }
}

export function getTaskResult(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.ASSOCIATE_TOKEN:
        case TaskAction.DISSOCIATE_TOKEN:
            return result.status;
        default:
            return result;
    }
}

export class NotificationEvents {
    public readonly taskId: string;
    public readonly userId: string;
    public readonly action: TaskAction;

    private notify: NotificationHelper;
    private static service: NatsService;

    constructor(options: {
        taskId: string;
        userId: string;
        action: TaskAction;
    }) {
        this.taskId = options.taskId;
        this.userId = options.userId;
        this.action = options.action;
        this.notify = null;
    }

    public static init(service: NatsService) {
        NotificationEvents.service = service;
    }

    public async init(): Promise<void> {
        const notificationHelper = NotificationHelper.init([this.userId]);
        this.notify = await notificationHelper.progress(this.action, 'Operation started', this.taskId);
    }

    public sendStatus(info: INotificationInfo): void {
        this.notify.step(info.message, info.progress);
        NotificationEvents.service.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            info,
            statuses: [{
                type: StatusType.PROCESSING,
                message: info.message,
            }],
        });
    }

    public sendError(error: {
        code: string | number,
        message: string
    }): void {
        this.notify.stop({
            title: this.action,
            message: error.message
        });
        NotificationEvents.service.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            error,
        });
    }

    public sendResult(result: any): void {
        const resultTitle = getNotificationResultTitle(this.action, result);
        if (resultTitle) {
            this.notify.finish({
                title: resultTitle,
                action: notificationActionMap.get(this.action),
                message: getNotificationResultMessage(this.action, result),
                result: getNotificationResult(this.action, result),
            });
        } else {
            this.notify.finish(null);
        }
        NotificationEvents.service.publish(MessageAPI.UPDATE_TASK_STATUS, {
            taskId: this.taskId,
            result: getTaskResult(this.action, result),
        });
    }
}