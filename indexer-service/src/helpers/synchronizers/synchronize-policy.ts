import { DataBaseHelper, Message, TokenCache } from '@indexer/common';
import { MessageType, MessageAction, PolicyAnalytics, TokenType } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { parsePolicyFile } from '../parsers/policy.parser.js';
import { HashComparator, PolicyLoader } from '../../analytics/index.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { fastLoadFiles, fastLoadFilesBuffer } from '../load-files.js';
import { BatchLoadHelper } from '../batch-load-helper.js';

export class SynchronizationPolicy extends SynchronizationTask {
    public readonly name: string = 'policy';

    constructor(mask: string) {
        super('policy', mask);
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');
        const collection2 = em.getCollection<TokenCache>('token_cache');

        console.log(`Sync Policies: load SRs`)
        const srMap = new Map<string, Message>();
        const srs = collection.find({ type: MessageType.STANDARD_REGISTRY });
        while (await srs.hasNext()) {
            const sr = await srs.next();
            if (sr.options?.registrantTopicId) {
                srMap.set(sr.options.registrantTopicId, sr);
            }
        }
        console.log(`Sync Policies: loaded ${srMap.size} SRs`)

        console.log(`Sync Policies: load topics`)
        const topicMap = new Map<string, Message[]>();
        const topics = collection.find({
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic
        });
        while (await topics.hasNext()) {
            const topic = await topics.next();
            if (topicMap.has(topic.topicId)) {
                topicMap.get(topic.topicId).push(topic);
            } else {
                topicMap.set(topic.topicId, [topic]);
            }
        }
        console.log(`Sync Policies: loaded ${topicMap.size} topics`)

        console.log(`Sync Policies: load documents`)
        const documentMap = new Map<string, { vc: number, vp: number, evc: number }>();
        const documents = collection.find({
            type: { $in: [MessageType.VC_DOCUMENT, MessageType.EVC_DOCUMENT, MessageType.VP_DOCUMENT] },
        });
        while (await documents.hasNext()) {
            const document = await documents.next();
            let data: { vc: number, vp: number, evc: number };
            if (documentMap.has(document.topicId)) {
                data = documentMap.get(document.topicId);
            } else {
                data = { vc: 0, vp: 0, evc: 0 };
            }
            if (document.type === MessageType.VC_DOCUMENT) {
                data.vc++;
            } else if (document.type === MessageType.EVC_DOCUMENT) {
                data.evc++;
            } else {
                data.vp++;
            }
            documentMap.set(document.topicId, data);
        }

        console.log(`Sync Policies: load token`)
        const tokenMap = new Map<string, TokenCache>();
        const tokens = collection2.find();
        while (await tokens.hasNext()) {
            const token = await tokens.next();
            tokenMap.set(token.tokenId, token);
        }

        const policies = collection.find({
            type: MessageType.INSTANCE_POLICY,
            action: MessageAction.PublishPolicy
        }, {
            sort: { analyticsUpdate: 1 },
            limit: 100000
        });

        await BatchLoadHelper.load<Message>(policies, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Sync Policies: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`)
            console.log(`Sync Policies: load policies`)
            const fileIds: Set<string> = new Set<string>();
            const allPolicies = [];
            for (const policy of rows) {
                allPolicies.push(policy);
                fileIds.add(policy.files?.[0]);
            }

            console.log(`Sync Policies: load files`, fileIds.size)
            const fileMap = await fastLoadFilesBuffer(fileIds);

            console.log(`Sync Policies: update data`)
            for (const policyRow of allPolicies) {
                const row = em.getReference(Message, policyRow._id);
                row.analytics = await this.createAnalytics(
                    policyRow,
                    topicMap,
                    srMap,
                    documentMap,
                    tokenMap,
                    fileMap
                );
                row.analyticsUpdate = Date.now();
                em.persist(row);                
            }
            console.log(`Sync Policies: flush batch`)
            await em.flush();
            await em.clear();
        });
    }

    private async createAnalytics(
        policyRow: Message,
        topicMap: Map<string, Message[]>,
        srMap: Map<string, Message>,
        documentMap: Map<string, { vc: number, vp: number, evc: number }>,
        tokenMap: Map<string, TokenCache>,
        fileMap: Map<string, Buffer>,
    ): Promise<any> {
        const analytics: PolicyAnalytics = {
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
        await this.findZip(policyRow, fileMap, analytics);
        this.findSR(policyRow, topicMap, srMap, analytics);
        this.findDocuments(policyRow, topicMap, documentMap, analytics);
        this.findNFTs(policyRow, tokenMap, analytics);
        this.findTags(policyRow, analytics);
        return analytics;
    }

    private async findZip(
        policyRow: any,
        fileMap: Map<string, Buffer>,
        analytics: PolicyAnalytics
    ): Promise<void> {
        const policyFileId = policyRow.files[0];
        const policyFileBuffer = fileMap.get(policyFileId);
        if (!policyFileBuffer) {
            return;
        }
        const policyData = await parsePolicyFile(policyFileBuffer, false);
        if (!policyData) {
            return;
        }
        analytics.tools = policyData.tools?.map((tool: any) => tool.messageId) || [];
        for (const tool of analytics.tools) {
            analytics.textSearch += `|${tool}`;
        }
        analytics.tokens = policyData.tokens?.map((token: any) => token.tokenId) || [];

        const compareModel = await PolicyLoader.create(policyData, HashComparator.options);
        const { hash, hashMap } = await HashComparator.createHashMap(compareModel);
        analytics.hash = hash;
        analytics.hashMap = hashMap;
    }

    private findSR(
        policyRow: any,
        topicMap: Map<string, Message[]>,
        srMap: Map<string, Message>,
        analytics: PolicyAnalytics
    ): void {
        const topicDescription = topicMap.get(policyRow.topicId)?.[0];
        if (!topicDescription) {
            return;
        }

        const parentTopicId = topicDescription.options?.parentId;
        const registry = srMap.get(parentTopicId);
        if (!registry) {
            return;
        }

        analytics.registryId = registry.consensusTimestamp;
        analytics.owner = registry.options?.did;
    }

    private findDocuments(
        policyRow: any,
        topicMap: Map<string, Message[]>,
        documentMap: Map<string, { vc: number, vp: number, evc: number }>,
        analytics: PolicyAnalytics
    ): void {
        const topics = new Set<string>();
        topics.add(policyRow.options?.instanceTopicId);

        const dynamicTopics = topicMap.get(policyRow.options?.instanceTopicId);
        if (dynamicTopics) {
            for (const dynamicTopic of dynamicTopics) {
                if (dynamicTopic.options?.messageType === 'DYNAMIC_TOPIC') {
                    topics.add(dynamicTopic.options?.childId)
                }
            }
        }

        analytics.vcCount = 0;
        analytics.vpCount = 0;
        for (const topicId of topics) {
            const documents = documentMap.get(topicId);
            if (documents) {
                analytics.vcCount = analytics.vcCount + documents.vc + documents.evc;
                analytics.vpCount = analytics.vpCount + documents.vp;
            }
        }

        analytics.dynamicTopics = Array.from(topics);
    }

    private findNFTs(
        policyRow: any,
        tokenMap: Map<string, TokenCache>,
        analytics: PolicyAnalytics
    ): void {
        if (!analytics.tokens || !analytics.tokens.length) {
            analytics.tokensCount = 0;
            return;
        }
        analytics.tokensCount = 0;
        for (const tokenId of analytics.tokens) {
            const token = tokenMap.get(tokenId);
            if (token) {
                if (token.type === TokenType.NFT) {
                    analytics.tokensCount += Number(token.serialNumber);
                } else {
                    analytics.tokensCount += Number(token.totalSupply);
                }
            }
        }
    }

    private findTags(policyRow: any, analytics: PolicyAnalytics): void {
        analytics.tags = [];
    }
}
