import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationDid extends SynchronizationTask {
    public readonly name: string = 'dids';

    constructor(mask: string) {
        super('dids', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncDidDocuments ---');
        console.time('--- syncDidDocuments 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync DIDs: update data`)
        const documents = collection.find({
            type: { $in: [MessageType.DID_DOCUMENT] },
            ...this.filter(),
        });
        while (await documents.hasNext()) {
            const document = await documents.next();
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncDidDocuments 1 ---');
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