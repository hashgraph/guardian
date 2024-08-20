import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationModules extends SynchronizationTask {
    public readonly name: string = 'modules';

    constructor(mask: string) {
        super('modules', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncModules ---');
        console.time('--- syncModules 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Modules: update data`)
        const modules = collection.find({
            type: MessageType.MODULE,
            action: MessageAction.PublishModule,
            ...this.filter(),
        });
        while (await modules.hasNext()) {
            const document = await modules.next();
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncModules 1 ---');
    }

    private createAnalytics(
        document: Message
    ): any {
        const analytics: any = {
            textSearch: textSearch(document)
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