import { MessageBrokerChannel } from '@guardian/common';

export interface Notifier {
    notify: (...statuses: string[]) => void;
}

const empty: Notifier = {
    notify: (...statuses: string[]) => { },
};

export function initStatusPublisher(channel: MessageBrokerChannel, taskId: string): Notifier {
    if (taskId) {
        return {
            notify: async (...statuses: string[]) => {
                console.log('notify', statuses[0]);
                //channel.publish('UPDATE_TASK_STATUS', { taskId, statuses });
                // TODO: Какой канал использовать?!
                await channel.request('api-gateway.UPDATE_TASK_STATUS', { taskId, statuses });
            },
        }
    } else {
        return empty;
    }
}