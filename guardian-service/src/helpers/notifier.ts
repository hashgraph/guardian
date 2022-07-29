import { MessageBrokerChannel } from '@guardian/common';
import { MessageAPI, StatusType, IStatus } from '@guardian/interfaces';

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
    error: (error: any) => void;

    /**
     * Notify about result
     */
    result: (result: any) => void;
}

const empty: INotifier = {
    /* tslint:disable:no-empty */
    start: (step: string) => { },
    completed: () => { },
    completedAndStart: (nextStep: string) => { },
    info: (message: string) => {},
    error: (error: any) => { },
    result: (result: any) => { }
    /* tslint:enable:no-empty */
};

/**
 * Return empty notifier
 * @returns {INotifier} - empty notifier
 */
export function emptyNotifier(): INotifier {
    return empty;
}

const chanelEvent = [ 'api-gateway', MessageAPI.UPDATE_TASK_STATUS ].join('.');

/**
 * Init task notifier
 * @param channel
 * @param taskId
 * @returns {INotifier} - notifier for task or empty notifier
 */
export function initNotifier(channel: MessageBrokerChannel, taskId: string): INotifier {
    if (taskId) {
        let currentStep: string;
        const sendStatuses = async (...statuses: IStatus[]) => {
            await channel.request(chanelEvent, { taskId, statuses });
        };
        const notifier = {
            start: async (step: string) => {
                currentStep = step;
                await sendStatuses({ message: step, type: StatusType.PROCESSING });
            },
            completed: async () => {
                const oldStep = currentStep;
                currentStep = undefined;
                await sendStatuses({ message: oldStep, type: StatusType.COMPLETED });
            },
            completedAndStart: async (nextStep: string) => {
                const oldStep = currentStep;
                if (oldStep) {
                    currentStep = nextStep;
                    await sendStatuses({ message: oldStep, type: StatusType.COMPLETED }, { message: currentStep, type: StatusType.PROCESSING });
                } else {
                    this.start(nextStep);
                }
            },
            info: async (message: string) => {
                await sendStatuses({ message, type: StatusType.INFO });
            },
            error: async (error: any) => {
                await channel.request(chanelEvent, { taskId, error });
            },
            result: async (result: any) => {
                await channel.request(chanelEvent, { taskId, result });
            }
        }
        return notifier;
    } else {
        return empty;
    }
}