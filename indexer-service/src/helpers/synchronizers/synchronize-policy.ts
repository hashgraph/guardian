import { DataBaseHelper, Message, TokenCache } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { safetyRunning } from '../../utils/safety-running.js';
import { parsePolicyFile } from '../parsers/policy.parser.js';
import { HashComparator, PolicyLoader } from '../../analytics/index.js';

interface IAnalytics {
    owner: string | undefined;
    textSearch: string | undefined;
    tools: any[] | undefined;
    tokens: string[] | undefined;
    registryId: string | undefined;
    vcCount: number | undefined;
    vpCount: number | undefined;
    tokensCount: number | undefined;
    tags: string[] | undefined;
    hash: string | undefined;
    hashMap: any | undefined;
}

enum TokenType {
    FT = 'FUNGIBLE_COMMON',
    NFT = 'NON_FUNGIBLE_UNIQUE',
}

async function findSR(policyRow: any, analytics: IAnalytics): Promise<IAnalytics> {
    const em = DataBaseHelper.getEntityManager();
    const topicDescription = await em.findOne(Message, {
        type: MessageType.TOPIC,
        action: MessageAction.CreateTopic,
        topicId: policyRow.topicId,
    } as any);

    if (!topicDescription) {
        return analytics;
    }

    const parentTopicId = topicDescription.options?.parentId;
    const registry = await em.findOne(Message, {
        type: MessageType.STANDARD_REGISTRY,
        'options.registrantTopicId': parentTopicId
    } as any);

    if (!registry) {
        return analytics;
    }

    analytics.registryId = registry.consensusTimestamp;
    analytics.owner = registry.options?.did;
}

async function findDocuments(policyRow: any, analytics: IAnalytics): Promise<IAnalytics> {
    const em = DataBaseHelper.getEntityManager();
    const topics = new Set<string>();
    topics.add(policyRow.options?.instanceTopicId);

    const dynamicTopics = await em.find(Message, {
        topicId: policyRow.options?.instanceTopicId,
        type: MessageType.TOPIC,
        action: MessageAction.CreateTopic,
        'options.messageType': 'DYNAMIC_TOPIC'
    } as any);

    for (const dynamicTopic of dynamicTopics) {
        topics.add(dynamicTopic.options?.childId)
    }

    const vc = await em.count(Message, {
        topicId: { $in: Array.from(topics) },
        type: { $in: [MessageType.VC_DOCUMENT, MessageType.EVC_DOCUMENT] },
    } as any);

    const vp = await em.count(Message, {
        topicId: { $in: Array.from(topics) },
        type: MessageType.VP_DOCUMENT,
    } as any);

    analytics.vcCount = vc;
    analytics.vpCount = vp;

    return analytics;
}

async function findNFTs(policyRow: any, analytics: IAnalytics): Promise<IAnalytics> {
    if (!analytics.tokens || !analytics.tokens.length) {
        analytics.tokensCount = 0;
        return analytics;
    }
    const em = DataBaseHelper.getEntityManager();
    const tokens = await em.find(TokenCache, {
        tokenId: { $in: analytics.tokens }
    } as any);
    let tokensCount = 0;
    for (const token of tokens) {
        if (token.type === TokenType.NFT) {
            tokensCount += Number(token.serialNumber);
        } else {
            tokensCount += Number(token.totalSupply);
        }
    }
    analytics.tokensCount = tokensCount;
    return analytics;
}

async function findTags(policyRow: any, analytics: IAnalytics): Promise<IAnalytics> {
    analytics.tags = [];
    return analytics;
}

export async function synchronizePolicies() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const policies = collection.find({
        type: MessageType.INSTANCE_POLICY,
        action: MessageAction.PublishPolicy
    });
    let index = 0;
    const count = await policies.count();
    while (await policies.hasNext()) {
        index++;
        console.log(`Sync policies: ${index}/${count}`);
        const policyRow = await policies.next();
        const analytics: IAnalytics = {
            owner: undefined,
            textSearch: textSearch(policyRow),
            tools: [],
            tokens: [],
            registryId: undefined,
            vcCount: 0,
            vpCount: 0,
            tokensCount: 0,
            tags: [],
            hash: null,
            hashMap: null
        };

        await safetyRunning(async () => {
            try {
                const policyFileId = policyRow.files[0];
                const policyFileBuffer = await DataBaseHelper.loadFile(policyFileId, true);
                if (!policyFileBuffer) {
                    return;
                }
                const policyData = await parsePolicyFile(policyFileBuffer, false);
                analytics.tools = policyData.tools?.map((tool: any) => tool.messageId) || [];
                for (const tool of analytics.tools) {
                    analytics.textSearch += `|${tool}`;
                }
                analytics.tokens = policyData.tokens?.map((token: any) => token.tokenId) || [];

                const compareModel = await PolicyLoader.create(policyData, HashComparator.options);
                const { hash, hashMap } = await HashComparator.createHashMap(compareModel);
                analytics.hash = hash;
                analytics.hashMap = hashMap;
            } catch (error) {
                console.log(error)
            }
        });

        await findSR(policyRow, analytics);
        await findDocuments(policyRow, analytics);
        await findNFTs(policyRow, analytics);
        await findTags(policyRow, analytics);

        await collection.updateOne(
            {
                _id: policyRow._id,
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
