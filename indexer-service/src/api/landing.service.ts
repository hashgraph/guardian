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

@Controller()
export class LandingService {
    @MessagePattern(IndexerMessageAPI.GET_LANDING_ANALYTICS)
    async getAnalytics(): Promise<AnyResponse<any>> {
        const em = DataBaseHelper.getEntityManager();
        const stats = await em.find(
            Analytics,
            {},
            {
                orderBy: {
                    date: -1,
                },
                limit: 10,
                fields: [
                    'registries',
                    'methodologies',
                    'projects',
                    'totalIssuance',
                    'totalSerialized',
                    'totalFungible',
                    'date',
                ],
            }
        );
        return new MessageResponse<IAnalytics[]>(stats.reverse());
    }

    @MessagePattern(IndexerMessageAPI.GET_PROJECTS_COORDINATES)
    async getProjects(): Promise<AnyResponse<IProjectCoordinates[]>> {
        const em = DataBaseHelper.getEntityManager();
        const coordinates: IProjectCoordinates[] = (await em.find(
            ProjectCoordinates,
            {}
        )) as any;
        return new MessageResponse<IProjectCoordinates[]>(coordinates);
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
                        entityId: "$tokenId",
                        priorityDate: "$priorityDate",
                        priorityStatus: "$priorityStatus",
                        priorityStatusDate: "$priorityStatusDate"
                    }
                },
                {
                    $unionWith: {
                        coll: "topic_cache",
                        pipeline: [
                            {
                                $project: {
                                    type: "Topic",
                                    _id: "$_id",
                                    entityId: "$topicId",
                                    priorityDate: "$priorityDate",
                                    priorityStatus: "$priorityStatus",
                                    priorityStatusDate: "$priorityStatusDate"
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
                            entityId: { $in: ids },
                            priorityStatusDate: { $ne: null }
                        }
                    }
                )
            } else {
                aggregate.push(
                    {
                        $match:
                        {
                            priorityStatusDate: { $ne: null }
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

            if (options.limit) {
                aggregate.push(
                    {
                        $limit: options.limit
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
                items: rows?.map((item: any) => { return {
                    type: item.type,
                    entityId: item.entityId,
                    priorityDate: item.priorityDate,
                    priorityStatusDate: item.priorityStatusDate,
                    priorityStatus: item.priorityStatus as PriorityStatus,
                    lastUpdate: item.lastUpdate,
                    hasNext: item.hasNext
                } }) || [],
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
            });

            const tokenResult = await em.nativeUpdate(TokenCache, { tokenId: { $in: Array.from(tokenIds) }, priorityDate: { $eq: null } }, {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
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
                }
            );

            return new MessageResponse(result != 0);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
