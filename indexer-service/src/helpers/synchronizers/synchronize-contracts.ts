import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationContracts extends SynchronizationTask {
    public readonly name: string = 'contracts';

    constructor(mask: string) {
        super('contracts', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncContracts ---');
        console.time('--- syncContracts 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Contracts: update data`)
        const contracts = collection.find({
            type: { $in: [MessageType.CONTRACT] },
            action: MessageAction.CreateContract,
            ...this.filter(),
        });
        while (await contracts.hasNext()) {
            const document = await contracts.next();
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncContracts 1 ---');
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