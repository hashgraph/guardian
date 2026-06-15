import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
    AnyResponse,
    MessageCache,
    ZipUtils
} from '@indexer/common';
import escapeStringRegexp from 'escape-string-regexp';
import { MessageAction, MessageType, Page, Policy, RawMessage, SearchPolicyParams, SearchPolicyResult, VCDetails, VC } from '@indexer/interfaces';
import { CompareOptions, HashComparator, PolicyComparator, PolicyLoader, PolicyModel } from '../analytics/index.js';
import { getPolicyData } from '../helpers/parsers/policy.parser.js';
import { parsePageParams } from '../utils/parse-page-params.js';

function createRegex(text: string) {
    return {
        $regex: `.*${escapeStringRegexp(text).trim()}.*`,
        $options: 'si',
    }
}

@Controller()
export class AnalyticsService {
    @MessagePattern(IndexerMessageAPI.GET_ANALYTICS_SEARCH_POLICY)
    async search(
        @Payload()
        msg: SearchPolicyParams
    ): Promise<AnyResponse<SearchPolicyResult[]>> {
        try {
            const {
                text,
                minVcCount,
                minVpCount,
                minTokensCount,
                owner,
                blocks
            } = msg;
            const em = DataBaseHelper.getEntityManager();
            const filter: any = {
                $and: [{
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                    analytics: { $exists: true }
                }],
            };
            if (text) {
                const keywords = text.split(' ');
                for (const keyword of keywords) {
                    filter.$and.push({
                        'analytics.textSearch': createRegex(keyword)
                    });
                }
            }
            if (minVcCount || minVcCount === 0) {
                filter.$and.push({
                    'analytics.vcCount': { $gte: minVcCount }
                });
            }
            if (minVpCount || minVpCount === 0) {
                filter.$and.push({
                    'analytics.vpCount': { $gte: minVpCount }
                });
            }
            if (minTokensCount || minTokensCount === 0) {
                filter.$and.push({
                    'analytics.tokensCount': { $gte: minTokensCount }
                });
            }
            if (owner) {
                filter.$and.push({
                    'analytics.owner': owner
                });
            }
            let policies: any[] = await em.find(Message, filter);

            if (blocks) {
                for (const policy of policies) {
                    try {
                        policy.rate = HashComparator.compare(blocks, policy.analytics);
                    } catch (error) {
                        policy.rate = -1;
                    }
                }
                policies = policies.filter((policy) => policy.rate >= blocks.threshold);
                policies.sort((a, b) => a.rate > b.rate ? -1 : 1);
            }

            const messageIds = policies.map(p => p.consensusTimestamp);
            const tags = await em.find(Message, {
                type: MessageType.TAG,
                'options.target': { $in: messageIds }
            } as any);
            const mapTags = new Map<string, Set<string>>();
            for (const tag of tags) {
                if (mapTags.has(tag.options.target)) {
                    mapTags.get(tag.options.target).add(tag.options.name);
                } else {
                    mapTags.set(tag.options.target, new Set([tag.options.name]));
                }
            }

            const results = policies.map((row) => {
                const policyTags = mapTags.has(row.consensusTimestamp) ?
                    Array.from(mapTags.get(row.consensusTimestamp)) : [];
                return {
                    type: 'Global',
                    topicId: row.topicId,
                    uuid: row.options.uuid,
                    name: row.options.name,
                    description: row.options.description,
                    version: row.options.version,
                    status: 'PUBLISH',
                    messageId: row.consensusTimestamp,
                    owner: row.analytics.owner,
                    textSearch: row.analytics.textSearch,
                    registryId: row.analytics.registryId,
                    vcCount: row.analytics.vcCount,
                    vpCount: row.analytics.vpCount,
                    tokensCount: row.analytics.tokensCount,
                    rate: row.rate,
                    tags: policyTags
                } as SearchPolicyResult
            }).slice(0, 100);
            return new MessageResponse<SearchPolicyResult[]>(results);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_RETIRE_DOCUMENTS)
    async getRetireDocuments(
        @Payload()
        msg: RawMessage
    ): Promise<AnyResponse<Message[]>> {
        try {
            const { topicId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const [messages] = (await em.findAndCount(
                Message,
                {
                    topicId,
                    action: MessageAction.CreateVC,
                } as any
            )) as any;

            const [messagesCache] = (await em.findAndCount(
                MessageCache,
                {
                    topicId,
                } as any
            )) as any;

            for (const message of messages) {
                const VCdocuments: VCDetails[] = [];
                for (const fileName of message.files) {
                    try {
                        const file = await DataBaseHelper.loadFile(fileName);
                        VCdocuments.push(JSON.parse(file) as VCDetails);
                        // tslint:disable-next-line:no-empty
                    } catch (error) {
                    }
                }
                message.documents = VCdocuments;

                const messageCache = messagesCache.find((cache: MessageCache) => cache.consensusTimestamp === message.consensusTimestamp);
                if (messageCache) {
                    message.sequenceNumber = messageCache.sequenceNumber;
                }
            }

            return new MessageResponse<Message[]>(messages);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_INDEXER_AVAILABILITY)
    async checkAvailability(): Promise<AnyResponse<boolean>> {
        return new MessageResponse<boolean>(true);
    }

    @MessagePattern(IndexerMessageAPI.GET_COMPARE_ORIGINAL_POLICY)
    async compareOriginalPolicy(@Payload() msg): Promise<AnyResponse<string>> {
        try {
            const { messageId, options } = msg;

            const compareOptions = CompareOptions.from(options);

            const compareModels: PolicyModel[] = [];
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
            } as any)) as Policy;
            const policyData = await getPolicyData(item);
            const compareModel = await PolicyLoader.create(policyData, compareOptions);
            compareModels.push(compareModel);
            let originalPolicyData = null;
            let originalItem = null;
            if (item.options?.originalMessageId) {
                originalItem = (await em.findOne(Message, {
                    consensusTimestamp: item.options.originalMessageId,
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                } as any)) as Policy;
            }
            else if (item.options?.originalHash) {
                originalItem = (await em.findOne(Message, {
                    'options.originalHash': item.options.originalHash,
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                } as any,
                    {
                        orderBy: { _id: 'ASC' },
                    }) as Policy);
            }

            if (originalItem) {
                originalPolicyData = await getPolicyData(originalItem);
            }

            if (!originalPolicyData) {
                return null;
            }

            const originalCompareModel = await PolicyLoader.create(originalPolicyData, compareOptions);
            compareModels.push(originalCompareModel);

            const comparator = new PolicyComparator(compareOptions);
            const results = comparator.compare(compareModels);

            const result = comparator.to(results, 'message');

            const zip = await ZipUtils.zipJson(result);
            return new MessageResponse(zip);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_DERIVATIONS)
    async getDerivations(@Payload() msg): Promise<AnyResponse<Page<Policy>>> {
        try {
            const options = parsePageParams(msg);

            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();

            const [rows, count] = (await em.findAndCount(Message, {
                'options.originalMessageId': messageId,
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
            } as any)) as [Policy[], number];

            for (const row of rows) {
                if (row.analytics) {
                    delete row.analytics.hashMap;
                }
            }

            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };

            return new MessageResponse<Page<Policy>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * GET_ANALYTICS_PROJECTS
     * Returns aggregate Mint Token VC data (tonnage) per policy project.
     * Fixes #4509: project/tonnage API for eCommerce consumers and track-record use-case.
     */
    @MessagePattern(IndexerMessageAPI.GET_ANALYTICS_PROJECTS)
    async getAnalyticsProjects(
        @Payload() msg: {
            pageIndex?: number;
            pageSize?: number;
            orderField?: string;
            orderDir?: string;
            policyId?: string;
            owner?: string;
            topicId?: string;
            minMinted?: number;
        }
    ): Promise<AnyResponse<any>> {
        try {
            const em = DataBaseHelper.getEntityManager();

            const pageSize = Number(msg.pageSize) || 25;
            const pageIndex = Number(msg.pageIndex) || 0;

            // Base policy filter
            const policyFilter: any = {
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
            };
            if (msg.policyId) {
                policyFilter.consensusTimestamp = msg.policyId;
            }
            if (msg.owner) {
                policyFilter['options.owner'] = msg.owner;
            }
            if (msg.topicId) {
                policyFilter.topicId = msg.topicId;
            }

            const policies: Policy[] = await em.find(Message, policyFilter as any) as Policy[];

            const results: any[] = [];

            for (const policy of policies) {
                // Find all Mint Token VCs under this policy
                const mintVcFilter: any = {
                    type: MessageType.VC_DOCUMENT,
                    'analytics.policyId': policy.consensusTimestamp,
                    'analytics.schemaName': createRegex('Mint Token'),
                };

                const mintVcs: VC[] = await em.find(Message, mintVcFilter as any) as VC[];

                if (mintVcs.length === 0) continue;

                // Aggregate by tokenId
                const tokenMap = new Map<string, { tokenName: string; total: number; count: number; lastTs: string }>();
                let grandTotal = 0;
                let lastTs = '';

                for (const vc of mintVcs) {
                    const vcAny: any = vc;
                    const amount = Number(vcAny.options?.amount ?? vcAny.document?.tokenAmount ?? 0);
                    const tId = vcAny.analytics?.tokenId ?? vcAny.options?.tokenId ?? 'unknown';
                    const tName = vcAny.options?.tokenName ?? tId;
                    const cTs = vc.consensusTimestamp ?? '';

                    grandTotal += amount;
                    if (!lastTs || cTs > lastTs) lastTs = cTs;

                    if (!tokenMap.has(tId)) {
                        tokenMap.set(tId, { tokenName: tName, total: 0, count: 0, lastTs: '' });
                    }
                    const entry = tokenMap.get(tId)!;
                    entry.total += amount;
                    entry.count += 1;
                    if (!entry.lastTs || cTs > entry.lastTs) entry.lastTs = cTs;
                }

                if (msg.minMinted && grandTotal < Number(msg.minMinted)) continue;

                const tokens = Array.from(tokenMap.entries()).map(([tokenId, d]) => ({
                    tokenId,
                    tokenName: d.tokenName,
                    totalMinted: d.total,
                    mintEventCount: d.count,
                    lastMintTimestamp: d.lastTs,
                }));

                results.push({
                    policyId: policy.consensusTimestamp,
                    policyName: policy.options?.name,
                    owner: policy.options?.owner,
                    totalMinted: grandTotal,
                    mintEventCount: mintVcs.length,
                    tokens,
                    topicId: policy.topicId,
                });
            }

            // Sort
            const orderDir = (msg.orderDir === 'DESC') ? -1 : 1;
            results.sort((a, b) => orderDir * (b.totalMinted - a.totalMinted));

            const total = results.length;
            const paged = results.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

            return new MessageResponse({
                items: paged,
                total,
                pageIndex,
                pageSize,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }

    /**
     * GET_ANALYTICS_VC_TREE
     * Returns a hierarchical tree of VC documents from a root message,
     * traversing options.relationships recursively up to maxDepth.
     * Addresses #4509: Tree API for eCommerce consumer context.
     */
    @MessagePattern(IndexerMessageAPI.GET_ANALYTICS_VC_TREE)
    async getVcTree(
        @Payload() msg: { messageId: string; maxDepth?: number }
    ): Promise<AnyResponse<any>> {
        try {
            const { messageId, maxDepth = 10 } = msg;
            const em = DataBaseHelper.getEntityManager();
            const visited = new Set<string>();

            const buildNode = async (id: string, depth: number): Promise<any | null> => {
                if (!id || visited.has(id) || depth > maxDepth) return null;
                visited.add(id);

                const item = await em.findOne(Message, {
                    consensusTimestamp: id,
                    type: MessageType.VC_DOCUMENT,
                } as any) as VC | null;

                if (!item) return null;

                const childIds: string[] = Array.isArray(item.options?.relationships)
                    ? (item.options.relationships as string[])
                    : [];

                const children: any[] = [];
                for (const childId of childIds) {
                    const child = await buildNode(childId, depth + 1);
                    if (child) children.push(child);
                }

                return {
                    messageId: item.consensusTimestamp,
                    type: item.type,
                    schemaName: item.analytics?.schemaName,
                    schemaId: item.analytics?.schemaId,
                    issuer: item.options?.issuer,
                    policyId: item.analytics?.policyId,
                    topicId: item.topicId,
                    consensusTimestamp: item.consensusTimestamp,
                    tokenAmount: (item as any).options?.amount,
                    tokenId: (item as any).analytics?.tokenId ?? (item as any).options?.tokenId,
                    children,
                };
            };

            const root = await buildNode(messageId, 0);
            if (!root) {
                return new MessageResponse({ rootId: messageId, depth: 0, nodeCount: 0, root: null });
            }

            // Count nodes
            const countNodes = (node: any): number =>
                1 + node.children.reduce((sum: number, c: any) => sum + countNodes(c), 0);
            const getDepth = (node: any): number =>
                node.children.length === 0 ? 0 : 1 + Math.max(...node.children.map(getDepth));

            return new MessageResponse({
                rootId: messageId,
                depth: getDepth(root),
                nodeCount: countNodes(root),
                root,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
}
