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

export async function syncRegistries() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const registries = await collection.find({
        type: { $in: [MessageType.STANDARD_REGISTRY] },
        ...filter(),
    });
    let index = 0;
    const count = await registries.count();
    while (await registries.hasNext()) {
        index++;
        console.log(`Sync registries ${index}/${count}`);
        const document = await registries.next();
        const analytics: any = {
            textSearch: textSearch(document),
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
