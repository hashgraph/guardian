import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    AnyResponse,
    DataBaseHelper,
    ProjectCoordinates,
    Analytics,
    Message,
    MessageCache,
    MessageError,
    TopicCache,
    TokenCache,
    Environment,
    TopicInfo,
} from '@indexer/common';
import {
    DataLoadingProgress,
    DataPriorityLoadingProgress,
    LandingAnalytics as IAnalytics,
    ProjectCoordinates as IProjectCoordinates,
    MessageType,
    Page,
    PageFilters,
    PriorityStatus,
} from '@indexer/interfaces';
import { parsePageParams } from '../utils/parse-page-params.js';
import axios from 'axios';

@Controller()
export class LoadingQueueService {

    private static mirrorNodeUrl: string;

    public static async init() {
        LoadingQueueService.mirrorNodeUrl = Environment.mirrorNode;
    }

    @MessagePattern(IndexerMessageAPI.GET_DATA_LOADING_PROGRESS)
    async getDataLoadingProgress(): Promise<AnyResponse<DataLoadingProgress>> {
        try {
            const em = DataBaseHelper.getEntityManager();

            const loadedCount = (await em.count(
                Message,
                {
                    loaded: true,
                } as any
            )) as any;

            const total = (await em.count(
                MessageCache,
                {
                    type: 'Message',
                } as any
            )) as any;

            return new MessageResponse<DataLoadingProgress>({ loadedCount, total });
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_DATA_PRIORITY_LOADING_PROGRESS)
    async getPriorityDataLoadingObjects(
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<DataPriorityLoadingProgress>>> {
        try {
            const options = parsePageParams(msg);

            const { entityId, entityIds } = msg;

            const ids = [];

            if (entityId) {
                ids.push(entityId)
            }

            if (entityIds) {
                ids.push(...entityIds.split(','))
            }

            const em = DataBaseHelper.getEntityManager();

            const aggregate: any[] = [
                {
                    $project: {
                        type: "Token",
                        _id: "$_id",
                        entityIds: ["$tokenId"],
                        priorityDate: "$priorityDate",
                        priorityStatus: "$priorityStatus",
                        priorityStatusDate: "$priorityStatusDate",
                        priorityTimestamp: "$priorityTimestamp",
                    }
                },
                {
                    $unionWith: {
                        coll: "topic_cache",
                        pipeline: [
                            {
                                $group: {
                                    _id: "$priorityTimestamp",
                                    entityIds: { $addToSet: "$topicId" },
                                    statuses: { $addToSet: "$priorityStatus" },
                                    firstDoc: { $first: "$$ROOT" }
                                }
                            },
                            {
                                $project: {
                                    type: { $literal: "Topic" },
                                    _id: "$firstDoc._id",
                                    entityIds: 1,
                                    priorityDate: "$firstDoc.priorityDate",
                                    priorityStatus: {
                                        $cond: {
                                            if: { $in: ["Running", "$statuses"] },
                                            then: "Running",
                                            else: {
                                                $cond: {
                                                    if: { $setEquals: ["$statuses", ["Scheduled"]] },
                                                    then: "Scheduled",
                                                    else: "Finished"
                                                }
                                            }
                                        },
                                    },
                                    priorityStatusDate: "$firstDoc.priorityStatusDate",
                                        priorityTimestamp: "$_id"
                                    }
                                }
                        ]
                    }
                },
            ];

            if (ids && ids.length > 0) {
                aggregate.push(
                    {
                        $match:
                        {
                            entityIds: { $in: ids },
                            priorityStatusDate: { $ne: null }
                        }
                    }
                )
            } else {
                aggregate.push(
                    {
                        $match:
                        {
                            priorityStatusDate: { $ne: null },
                            priorityTimestamp: { $ne: null }
                        }
                    }
                )
            }

            if (options.orderBy) {
                aggregate.push(
                    {
                        $sort: options.aggregateOrderBy
                    }
                )
            }

            if (options.offset) {
                aggregate.push(
                    {
                        $skip: options.offset
                    }
                )
            }

            if (options.limit) {
                aggregate.push(
                    {
                        $limit: options.limit
                    }
                )
            }

            const rows = await em.aggregate(TokenCache, aggregate);

            const topicFilter: any = {
                priorityStatusDate: { $ne: null }
            };
            const tokenFilter: any = {
                priorityStatusDate: { $ne: null }
            };
            if (ids && ids.length > 0) {
                topicFilter.topicId = { $in: ids }
                tokenFilter.tokenId = { $in: ids }
            }

            const topicCount = await em.count(
                TopicCache,
                topicFilter
            );
            const tokenCount = await em.count(
                TokenCache,
                tokenFilter
            );


            const result = {
                items: rows?.map((item: any) => {
                    return {
                        type: item.type,
                        entityId: item.entityIds[0],
                        priorityDate: item.priorityDate,
                        priorityStatusDate: item.priorityStatusDate,
                        priorityStatus: item.priorityStatus as PriorityStatus,
                        lastUpdate: item.lastUpdate,
                        hasNext: item.hasNext
                    }
                }) || [],
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: topicCount + tokenCount,
                order: options.orderBy,
            };

            return new MessageResponse<Page<DataPriorityLoadingProgress>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_TOPICS)
    async setPriorityDataLoadingTopics(
        @Payload() msg: { topicIds: string[] }
    ) {
        try {
            const { topicIds } = msg;
            const em = DataBaseHelper.getEntityManager();

            const topicResult = await em.nativeUpdate(TopicCache, {
                topicId: { $in: topicIds },
                priorityDate: { $eq: null }
            },
                {
                    priorityDate: new Date(),
                    priorityStatus: PriorityStatus.SCHEDULED,
                    priorityStatusDate: new Date(),
                    priorityTimestamp: Date.parse(new Date().toString()),
                }
            );

            const messageResult = await em.nativeUpdate(MessageCache, {
                topicId: { $in: topicIds },
                priorityDate: { $eq: null }
            },
                {
                    priorityDate: new Date(),
                }
            );

            return new MessageResponse((topicResult + messageResult) != 0);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_POLICY)
    async setPriorityDataLoadingPolicies(
        @Payload() msg: { policyTopicIds: string[] }
    ) {
        try {
            const { policyTopicIds } = msg;
            const em = DataBaseHelper.getEntityManager();

            const row = await em.find(
                Message,
                {
                    type: MessageType.INSTANCE_POLICY,
                    'options.instanceTopicId': { $in: policyTopicIds }
                } as any,
            )

            const topicIds = new Set<string>();
            const tokenIds = new Set<string>();

            row.forEach(item => {
                if (item.analytics) {
                    if (item.analytics.dynamicTopics) {
                        item.analytics.dynamicTopics.forEach(id => {
                            topicIds.add(id)
                        });
                    }
                    if (item.analytics.tokens) {
                        item.analytics.tokens.forEach(id => {
                            tokenIds.add(id)
                        });
                    }
                }
            });

            const topicResult = await em.nativeUpdate(TopicCache, { topicId: { $in: Array.from(topicIds) }, priorityDate: { $eq: null } }, {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
                priorityTimestamp: Date.parse(new Date().toString()),
            });

            const tokenResult = await em.nativeUpdate(TokenCache, { tokenId: { $in: Array.from(tokenIds) }, priorityDate: { $eq: null } }, {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
                priorityTimestamp: Date.parse(new Date().toString()),
            });

            const messageResult = await em.nativeUpdate(MessageCache, {
                topicId: { $in: Array.from(topicIds) },
                priorityDate: { $eq: null }
            },
                {
                    priorityDate: new Date(),
                }
            );

            return new MessageResponse((topicResult + tokenResult + messageResult) != 0);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_TOKENS)
    async setPriorityDataLoadingTokens(
        @Payload() msg: { tokenIds: string[] }
    ) {
        try {
            const { tokenIds } = msg;
            const em = DataBaseHelper.getEntityManager();

            const result = await em.nativeUpdate(TokenCache, {
                tokenId: { $in: tokenIds },
                priorityDate: { $eq: null }
            },
                {
                    priorityDate: new Date(),
                    priorityStatus: PriorityStatus.SCHEDULED,
                    priorityStatusDate: new Date(),
                    priorityTimestamp: Date.parse(new Date().toString()),
                }
            );

            return new MessageResponse(result != 0);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.SET_DATA_PRIORITY_LOADING_PROGRESS_ANY)
    async setPriorityDataLoadingAny(
        @Payload() msg: { entityId: string }
    ) {
        try {
            const { entityId } = msg;

            const cacheResult = await this.trySetPriorityFromCache(entityId);
            if (cacheResult?.body) {
                return cacheResult;
            }

            const parentIds = new Set<string>();
            const hederaResult = await this.trySetPriorityFromHedera(entityId, parentIds);

            if (hederaResult) {
                return hederaResult;
            }

            return new MessageResponse(false);

        } catch (error) {
            return new MessageError(error);
        }
    }

    private async trySetPriorityFromCache(entityId: string) {
        try {
            const policyResult = await this.setPriorityDataLoadingPolicies({ policyTopicIds: [entityId] })
            if (policyResult?.body) {
                return policyResult;
            }

            const topicResult = await this.setPriorityDataLoadingTopics({ topicIds: [entityId] })
            if (topicResult?.body) {
                return topicResult;
            }

            const tokenResult = await this.setPriorityDataLoadingTokens({ tokenIds: [entityId] })
            if (tokenResult?.body) {
                return tokenResult;
            }

            return new MessageResponse(false);
        } catch (error) {
            return new MessageError(error);
        }
    }

    private async trySetPriorityFromHedera(entityId: string, parentIds: Set<string>, depth: number = 0) {
        if (depth >= 10) {
            console.log("Recursion limit reached: ", depth);
            return new MessageResponse(false);
        }

        if (parentIds.has(entityId)) {
            console.log("Recursion already touched: ", entityId);
            return new MessageResponse(false);
        }

        parentIds.add(entityId);

        try {
            const url = LoadingQueueService.mirrorNodeUrl + 'topics/' + entityId + '/messages';
            const option: any = {
                params: {
                    limit: 1
                },
                responseType: 'json',
                timeout: 2 * 60 * 1000,
            };

            const response = await axios.get(url, option);
            const topicInfo = response?.data as TopicInfo;
            if (topicInfo && Array.isArray(topicInfo.messages) && topicInfo.messages.length > 0) {
                for (const data of topicInfo.messages) {
                    const message = this.parseMessage(data);

                    if (message && message.type == 'Topic' && message.parentId) {
                        const cacheResult = await this.trySetPriorityFromCache(message.parentId);

                        if (cacheResult?.body) {
                            return cacheResult;
                        }

                        return await this.trySetPriorityFromHedera(message.parentId, parentIds, depth + 1);
                    }
                }
            } else {
                return new MessageResponse(false);
            }
        } catch (error) {
            console.log('getMessages ', entityId, error.message);
            return new MessageError(error);
        }
    }

    private parseMessage(row: any): any {
        try {
            if (!row.message) {
                return null;
            }

            const buffer = Buffer.from(row.message, 'base64').toString();

            const message = JSON.parse(buffer);
            if (typeof message !== 'object') {
                return null;
            }

            return message;
        } catch (error) {
            return null;
        }
    }
}
