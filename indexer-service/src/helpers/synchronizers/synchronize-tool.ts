import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationTools extends SynchronizationTask {
    public readonly name: string = 'tools';

    constructor(mask: string) {
        super('tools', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncTools ---');
        console.time('--- syncTools 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Tools: update data`)
        const tools = collection.find({
            type: { $in: [MessageType.TOOL] },
            action: MessageAction.PublishTool,
            ...this.filter(),
        });
        while (await tools.hasNext()) {
            const tool = await tools.next();
            const row = em.getReference(Message, tool._id);
            row.analytics = this.createAnalytics(tool);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncTools 1 ---');
    }

    private createAnalytics(
        tool: Message
    ): any {
        const analytics: any = {
            textSearch: textSearch(tool),
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