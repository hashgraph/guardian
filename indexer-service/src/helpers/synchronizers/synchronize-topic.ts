import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationTopics extends SynchronizationTask {
    public readonly name: string = 'topics';

    constructor(mask: string) {
        super('topics', mask);
    }

    protected override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Topics: update data`)
        const topics = collection.find({
            type: { $in: [MessageType.TOPIC] },
            action: MessageAction.CreateTopic,
            ...this.filter(),
        });
        while (await topics.hasNext()) {
            const topic = await topics.next();
            const row = em.getReference(Message, topic._id);
            row.analytics = this.createAnalytics(topic);
            em.persist(row);
        }
        console.log(`Sync Topics: flush`)
        await em.flush();
    }

    private createAnalytics(
        topic: Message
    ): any {
        const analytics: any = {
            textSearch: textSearch(topic),
        };
        return analytics;
    }

    private filter() {
        return {
            $or: [
                {
                    'analytics.textSearch': null,
                },
            ],
        };
    }
}