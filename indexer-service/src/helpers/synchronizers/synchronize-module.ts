import { DataBaseHelper } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';

function filter() {
    return {
        $or: [
            {
                'analytics.textSearch': null,
            },
        ],
    };
}

export async function syncModules() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const modules = await collection.find({
        type: { $in: [MessageType.MODULE] },
        action: MessageAction.PublishModule,
        ...filter(),
    });
    let index = 0;
    const count = await modules.count();
    while (await modules.hasNext()) {
        index++;
        console.log(`Sync modules ${index}/${count}`);
        const document = await modules.next();
        const analytics: any = {
            textSearch: textSearch(document)
        };
        await collection.updateOne(
            {
                _id: document._id,
            },
            {
                $set: {
                    analytics,
                },
            },
            {
                upsert: false,
            }
        );
    }
}
