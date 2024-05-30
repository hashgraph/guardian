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

export async function syncTopics() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const topics = await collection.find({
        type: { $in: [MessageType.TOPIC] },
        action: MessageAction.CreateTopic,
        ...filter(),
    });
    let index = 0;
    const count = await topics.count();
    while (await topics.hasNext()) {
        index++;
        console.log(`Sync topics ${index}/${count}`);
        const document = await topics.next();
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
