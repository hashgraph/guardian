import { NotificationHelper } from '@guardian/common';
import {
    IStatus,
    MessageAPI,
    NotificationAction,
    StatusType,
    TaskAction,
} from '@guardian/interfaces';
import { GuardiansService } from '../helpers/guardians.js';

/**
 * Interface of notifier
 */
export interface INotifier {
    /**
     * Notify about starting of new part of process
     */
    start: (step: string) => void;

    /**
     * Notify about compliteing of started part of process
     */
    completed: () => void;

    /**
     * Notify about compliteing of started part of process and starting of new one
     */
    completedAndStart: (nextStep: string) => void;

    /**
     * Notify with info-message
     */
    info: (message: string) => void;

    /**
     * Nofity about error
     */
    error: (error: string | Error, code?: string) => void;

    /**
     * Notify about result
     */
    result: (result: any) => void;

    /**
     * Set sub lvl
     */
    sub: (value: boolean) => void;
}

const empty: INotifier = {
    /* tslint:disable:no-empty */
    start: (step: string) => { },
    completed: () => { },
    completedAndStart: (nextStep: string) => { },
    info: (message: string) => { },
    error: (error: string | Error, code?: string) => { },
    result: (result: any) => { },
    sub: (value: boolean) => { },
    /* tslint:enable:no-empty */
};

/**
 * Return empty notifier
 * @returns {INotifier} - empty notifier
 */
export function emptyNotifier(): INotifier {
    return empty;
}

const notificationActionMap = new Map<TaskAction, NotificationAction>([
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
    [TaskAction.DELETE_POLICY, NotificationAction.POLICIES_PAGE],
    [TaskAction.CLONE_POLICY, NotificationAction.POLICY_CONFIGURATION],
]);
const taskResultTitleMap = new Map<TaskAction, string>([
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
]);

function getNotificationResultMessage(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.CREATE_POLICY:
            return `Policy ${result} created`;
        case TaskAction.PUBLISH_POLICY:
            return `Policy ${result.policyId} published`;
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

function getNotificationResultTitle(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.PUBLISH_POLICY:
            if (!result.isValid) {
                return;
            }
        default:
            return taskResultTitleMap.get(action);
    }
}

function getNotificationResult(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.CREATE_TOOL:
        case TaskAction.CREATE_POLICY:
        case TaskAction.CLONE_POLICY:
            return result;
        case TaskAction.WIZARD_CREATE_POLICY:
        case TaskAction.IMPORT_POLICY_FILE:
        case TaskAction.IMPORT_POLICY_MESSAGE:
        case TaskAction.PUBLISH_POLICY:
            return result.policyId;
        case TaskAction.IMPORT_TOOL_FILE:
        case TaskAction.IMPORT_TOOL_MESSAGE:
            return result.toolId;
        default:
            return result;
    }
}

function getTaskResult(action: TaskAction, result: any) {
    switch (action) {
        case TaskAction.ASSOCIATE_TOKEN:
        case TaskAction.DISSOCIATE_TOKEN:
            return result.status;
        default:
            return result;
    }
}

const chanelEvent = MessageAPI.UPDATE_TASK_STATUS;

/**
 * Init task notifier
 * @param channel
 * @param taskId
 * @returns {INotifier} - notifier for task or empty notifier
 */
export async function initNotifier({
    taskId,
    userId,
    action,
    expectation,
}: {
    taskId: string;
    userId: string;
    action: TaskAction;
    expectation: number;
}): Promise<INotifier> {
    if (taskId) {
        let currentLvl: number = 0;
        let currentStep: string;
        let currentStepIndex = 0;
        const notificationHelper = NotificationHelper.init([userId]);
        const notify = await notificationHelper.progress(
            action,
            'Operation started',
            taskId
        );
        const sendStatuses = (...statuses: IStatus[]) => {
            notify.step(
                statuses[statuses.length - 1].message,
                Math.floor((currentStepIndex / expectation) * 100)
            );
            new GuardiansService().publish(chanelEvent, {
                taskId,
                statuses,
            });
        };
        const notifier = {
            start: (step: string) => {
                currentStep = step;
                sendStatuses({
                    message: step,
                    type: StatusType.PROCESSING,
                });
            },
            completed: () => {
                const oldStep = currentStep;
                currentStep = undefined;
                currentStepIndex++;
                sendStatuses({
                    message: oldStep,
                    type: StatusType.COMPLETED,
                });
            },
            completedAndStart: (nextStep: string) => {
                if (currentLvl) {
                    sendStatuses({ message: nextStep, type: StatusType.INFO });
                } else {
                    const oldStep = currentStep;
                    currentStepIndex++;
                    if (oldStep) {
                        currentStep = nextStep;
                        sendStatuses(
                            { message: oldStep, type: StatusType.COMPLETED },
                            { message: currentStep, type: StatusType.PROCESSING }
                        );
                    } else {
                        notifier.start(nextStep);
                    }
                }
            },
            info: (message: string) => {
                sendStatuses({ message, type: StatusType.INFO });
            },
            error: (error: string | Error, code?: string) => {
                const result = {
                    code: code || 500,
                    message: null,
                };
                if (typeof error === 'string') {
                    result.message = error;
                } else {
                    if (error.message) {
                        result.message = error.message;
                    } else if (error.stack) {
                        result.message = error.stack;
                    } else {
                        result.message = 'Unknown error';
                    }
                }
                notify.stop({
                    title: action,
                    message: error instanceof Error ? error.message : error,
                });
                new GuardiansService().publish(chanelEvent, {
                    taskId,
                    error: result,
                });
            },
            result: (result: any) => {
                const resultTitle = getNotificationResultTitle(action, result);
                notify.finish(
                    resultTitle
                        ? {
                            title: resultTitle,
                            action: notificationActionMap.get(action),
                            message: getNotificationResultMessage(
                                action,
                                result
                            ),
                            result: getNotificationResult(action, result),
                        }
                        : null
                );
                new GuardiansService().publish(chanelEvent, {
                    taskId,
                    result: getTaskResult(action, result),
                });
            },
            sub: (value: boolean) => {
                if (value) {
                    currentLvl = 1;
                } else {
                    currentLvl = 0;
                }
            },
        };
        return notifier;
    } else {
        return empty;
    }
}
