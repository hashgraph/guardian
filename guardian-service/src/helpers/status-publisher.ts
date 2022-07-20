import { MessageBrokerChannel } from '@guardian/common';

export interface INotifier {
    start: (step: string) => void;
    completed: () => void;
    completedAndStart: (nextStep: string) => void;
}

const empty: INotifier = {
    start: (step: string) => { },
    completed: () => { },
    completedAndStart: (nextStep: string) => { },
};

export function initNotifier(channel: MessageBrokerChannel, taskId: string): INotifier {
    const chanelEvent = 'api-gateway.UPDATE_TASK_STATUS';
    const startSuffix = " - start";
    const completedSuffix = " - competed";
    if (taskId) {
        let currentStep: string;
        const notifier = {
            start: async (step: string) => {
                currentStep = step;
                await channel.request(chanelEvent, { taskId: taskId, statuses: [step + startSuffix]});
            },
            completed: async () => {
                const oldStep = currentStep;
                currentStep = undefined;
                await channel.request(chanelEvent, { taskId: taskId, statuses: [oldStep + completedSuffix]});
            },
            completedAndStart: async (nextStep: string) => {
                const oldStep = currentStep;
                if (oldStep) {
                    currentStep = nextStep;
                    await channel.request(chanelEvent, {
                        taskId: taskId,
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