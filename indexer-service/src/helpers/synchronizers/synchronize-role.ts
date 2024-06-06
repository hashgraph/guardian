import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';

function filter() {
    return {
        $or: [
            {
                'analytics.textSearch': null,
            },
            {
                'analytics.policyId': null,
            },
        ],
    };
}

export async function syncRoles() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const roles = await collection.find({
        type: { $in: [MessageType.ROLE_DOCUMENT] },
        ...filter(),
    });
    let index = 0;
    const count = await roles.count();
    while (await roles.hasNext()) {
        index++;
        console.log(`Sync roles ${index}/${count}`);
        const document = await roles.next();
        const analytics: any = {
            textSearch: textSearch(document),
        };
        const policyMessage = await em.findOne(Message, {
            type: MessageType.INSTANCE_POLICY,
            'options.instanceTopicId': document.topicId,
        } as any);
        if (policyMessage) {
            analytics.policyId = policyMessage.consensusTimestamp;
            analytics.textSearch += `|${policyMessage.consensusTimestamp}`;
        }
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
