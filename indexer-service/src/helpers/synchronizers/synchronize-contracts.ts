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

export async function syncContracts() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const contracts = await collection.find({
        type: { $in: [MessageType.CONTRACT] },
        action: MessageAction.CreateContract,
        ...filter(),
    });
    let index = 0;
    const count = await contracts.count();
    while (await contracts.hasNext()) {
        index++;
        console.log(`Sync contracts ${index}/${count}`);
        const document = await contracts.next();
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
