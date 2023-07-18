import { NotifierHelper } from '@guardian/common';
import {
    IStatus,
    MessageAPI,
    NotificationAction,
    StatusType,
    TaskAction,
} from '@guardian/interfaces';
import { GuardiansService } from '@helpers/guardians';

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
}

const empty: INotifier = {
    /* tslint:disable:no-empty */
    start: (step: string) => {},
    completed: () => {},
    completedAndStart: (nextStep: string) => {},
    info: (message: string) => {},
    error: (error: string | Error, code?: string) => {},
    result: (result: any) => {},
    /* tslint:enable:no-empty */
};

/**
 * Return empty notifier
 * @returns {INotifier} - empty notifier
 */
export function emptyNotifier(): INotifier {
    return empty;
}

const chanelEvent = MessageAPI.UPDATE_TASK_STATUS;
const resultNotificationMapping = new Map<
    TaskAction | string,
    NotificationAction
>([
    [
        TaskAction.ASSOCIATE_DISSOCIATE_TOKEN,
        NotificationAction.TOKEN_ASSOCIATED_DIASSOCIATED,
    ],
    [TaskAction.CLONE_POLICY, NotificationAction.POLICY_CLONED],
    [TaskAction.CREATE_POLICY, NotificationAction.POLICY_CREATED],
    [TaskAction.CREATE_SCHEMA, NotificationAction.SCHEMA_CREATED],
    [TaskAction.CREATE_TOKEN, NotificationAction.TOKEN_CREATED],
    [TaskAction.DELETE_POLICY, NotificationAction.POLICY_DELETED],
    [TaskAction.GRANT_REVOKE_KYC, NotificationAction.KYC_GRANTED_REVOKED],
    [TaskAction.IMPORT_POLICY_FILE, NotificationAction.POLICY_IMPORTED],
    [TaskAction.IMPORT_POLICY_MESSAGE, NotificationAction.POLICY_IMPORTED],
    [TaskAction.IMPORT_SCHEMA_FILE, NotificationAction.SCHEMA_IMPORTED],
    [TaskAction.IMPORT_SCHEMA_MESSAGE, NotificationAction.SCHEMA_IMPORTED],
    [TaskAction.PUBLISH_POLICY, NotificationAction.POLICY_PUBLISHED],
    [TaskAction.PUBLISH_SCHEMA, NotificationAction.SCHEMA_PUBLISHED],
]);

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
    action: NotificationAction | string;
    expectation: number;
}): Promise<INotifier> {
    if (taskId) {
        let currentStep: string;
        let currentStepIndex = 1;
        const notify = await NotifierHelper.initNotifier(
            [userId],
            action,
            'Operation started',
            taskId
        );
        const sendStatuses = async (...statuses: IStatus[]) => {
            if (statuses.length) {
                await notify.step(
                    statuses[statuses.length - 1].message,
                    Math.floor((currentStepIndex / expectation) * 100)
                );
            }
            await new GuardiansService().sendMessage(chanelEvent, {
                taskId,
                statuses,
            });
        };
        const notifier = {
            start: async (step: string) => {
                currentStep = step;
                await sendStatuses({
                    message: step,
                    type: StatusType.PROCESSING,
                });
            },
            completed: async () => {
                const oldStep = currentStep;
                currentStep = undefined;
                currentStepIndex++;
                await sendStatuses({
                    message: oldStep,
                    type: StatusType.COMPLETED,
                });
            },
            completedAndStart: async (nextStep: string) => {
                const oldStep = currentStep;
                currentStepIndex++;
                if (oldStep) {
                    currentStep = nextStep;
                    await sendStatuses(
                        { message: oldStep, type: StatusType.COMPLETED },
                        { message: currentStep, type: StatusType.PROCESSING }
                    );
                } else {
                    await await notifier.start(nextStep);
                }
            },
            info: async (message: string) => {
                await sendStatuses({ message, type: StatusType.INFO });
            },
            error: async (error: string | Error, code?: string) => {
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
                await notify.error(
                    error instanceof Error ? error.message : error
                );
                await new GuardiansService().sendMessage(chanelEvent, {
                    taskId,
                    error: result,
                });
            },
            result: async (result: any) => {
                await notify.finish(
                    resultNotificationMapping.get(action),
                    'Operation completed',
                    result
                );
                await new GuardiansService().sendMessage(chanelEvent, {
                    taskId,
                    result,
                });
            },
        };
        return notifier;
    } else {
        return empty;
    }
}
