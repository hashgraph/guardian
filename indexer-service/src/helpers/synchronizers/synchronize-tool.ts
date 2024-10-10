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

export async function syncTools() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const tools = await collection.find({
        type: { $in: [MessageType.TOOL] },
        action: MessageAction.PublishTool,
        ...filter(),
    });
    let index = 0;
    const count = await tools.count();
    while (await tools.hasNext()) {
        index++;
        console.log(`Sync tools ${index}/${count}`);
        const document = await tools.next();
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
