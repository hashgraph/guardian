import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
    AnyResponse,
    MessageCache
} from '@indexer/common';
import escapeStringRegexp from 'escape-string-regexp';
import { MessageAction, MessageType, Page, Policy, RawMessage, SearchPolicyParams, SearchPolicyResult, VCDetails } from '@indexer/interfaces';
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
    async compareOriginalPolicy(@Payload() msg): Promise<AnyResponse<boolean>> {
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
            if(policyData.policy.originalMessageId) {
                originalItem = (await em.findOne(Message, {
                    consensusTimestamp: policyData.policy.originalMessageId,
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                } as any)) as Policy;
            }
            else if(policyData.policy.originalHash) {
                originalItem = (await em.findOne(Message, {
                    'options.originalHash': policyData.policy.originalHash,
                    type: MessageType.INSTANCE_POLICY,
                    action: MessageAction.PublishPolicy,
                } as any,
                {
                    orderBy: { _id: 'ASC' },
                }) as Policy);
            }

            if(originalItem) {
                originalPolicyData = await getPolicyData(originalItem);
            }

            if(!originalPolicyData) {
                return null;
            }

            const originalCompareModel = await PolicyLoader.create(originalPolicyData, compareOptions);
            compareModels.push(originalCompareModel);

            const comparator = new PolicyComparator(compareOptions);
            const results = comparator.compare(compareModels);

            const result = comparator.to(results, 'message');

            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_DERIVATIONS)
    async getDerivations(@Payload() msg):  Promise<AnyResponse<Page<Policy>>> {
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
}
