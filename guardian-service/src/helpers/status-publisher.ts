import { MessageBrokerChannel } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

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
}

const empty: INotifier = {
    /* tslint:disable:no-empty */
    start: (step: string) => { },
    completed: () => { },
    completedAndStart: (nextStep: string) => { },
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
const startSuffix = ' - start';
const completedSuffix = ' - competed';

/**
 * Init task notifier
 * @param channel
 * @param taskId
 * @returns {INotifier} - notifier for task or empty notifier
 */
export function initNotifier(channel: MessageBrokerChannel, taskId: string): INotifier {
    if (taskId) {
        let currentStep: string;
        const notifier = {
            start: async (step: string) => {
                currentStep = step;
                await channel.request(chanelEvent, { taskId, statuses: [step + startSuffix]});
            },
            completed: async () => {
                const oldStep = currentStep;
                currentStep = undefined;
                await channel.request(chanelEvent, { taskId, statuses: [oldStep + completedSuffix]});
            },
            completedAndStart: async (nextStep: string) => {
                const oldStep = currentStep;
                if (oldStep) {
                    currentStep = nextStep;
                    await channel.request(chanelEvent, {
                        taskId,
                        statuses: [oldStep + completedSuffix, currentStep + startSuffix]
                    });
                } else {
                    this.completed();
                }
            },
        }
        return notifier;
    } else {
        return empty;
    }
}