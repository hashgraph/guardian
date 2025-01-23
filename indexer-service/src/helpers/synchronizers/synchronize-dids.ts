import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationDid extends SynchronizationTask {
    public readonly name: string = 'dids';

    constructor(mask: string) {
        super('dids', mask);
    }

    public override async sync(): Promise<void> {
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
        console.log(`Sync DIDs: flush`)
        await em.flush();
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