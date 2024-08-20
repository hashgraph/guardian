import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationRegistries extends SynchronizationTask {
    public readonly name: string = 'registries';

    constructor(mask: string) {
        super('registries', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncRegistries ---');
        console.time('--- syncRegistries 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Registries: update data`)
        const registries = collection.find({
            type: MessageType.STANDARD_REGISTRY,
            ...this.filter(),
        });
        while (await registries.hasNext()) {
            const document = await registries.next();
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncRegistries 1 ---');
    }

    private createAnalytics(
        document: Message
    ): any {
        const analytics: any = {
            textSearch: textSearch(document),
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