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

export async function syncDidDocuments() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const documents = await collection.find({
        type: { $in: [MessageType.DID_DOCUMENT] },
        ...filter(),
    });
    let index = 0;
    const count = await documents.count();
    while (await documents.hasNext()) {
        index++;
        console.log(`Sync did-documents ${index}/${count}`);
        const document = await documents.next();
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
