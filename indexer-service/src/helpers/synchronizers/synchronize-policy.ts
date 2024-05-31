import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { safetyRunning } from '../../utils/safety-running.js';
import { parsePolicyFile } from '../parsers/policy.parser.js';

function filter() {
    return {
        $or: [
            {
                'analytics.textSearch': null,
            },
            {
                'analytics.registryId': null,
            },
            {
                'analytics.tools': null,
            },
        ],
    };
}

export async function sychronizePolicies() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const policies = await collection.find({
        type: MessageType.INSTANCE_POLICY,
        action: MessageAction.PublishPolicy,
        ...filter(),
    });
    let index = 0;
    const count = await policies.count();
    while (await policies.hasNext()) {
        index++;
        console.log(`Sync policies: ${index}/${count}`);
        const policy = await policies.next();
        const analytics: any = {
            textSearch: textSearch(policy),
        };

        await safetyRunning(async () => {
            const policyFileId = policy.files[0];
            const policyFileBuffer = await DataBaseHelper.loadFile(
                policyFileId,
                true
            );
            const policyFile = await parsePolicyFile(policyFileBuffer, false);
            analytics.tools =
                policyFile.policy.tools?.map((tool) => tool.messageId) || [];
            for (const tool of analytics.tools) {
                analytics.textSearch += `|${tool}`;
            }
        });

        const userTopicId = await em.findOne(Message, {
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic,
            'options.childId': policy.topicId,
        } as any);
        if (!userTopicId) {
            continue;
        }
        const registry = await em.findOne(Message, {
            type: MessageType.STANDARD_REGISTRY,
            'options.registrantTopicId': userTopicId.topicId,
        } as any);
        if (!registry) {
            continue;
        }
        analytics.registryId = registry.consensusTimestamp;

        await collection.updateOne(
            {
                _id: policy._id,
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
