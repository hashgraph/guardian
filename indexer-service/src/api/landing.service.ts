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

            const { topicId, topicIds } = msg;

            const em = DataBaseHelper.getEntityManager();

            const filter: any = {
                $or: [
                    { priorityStatusDate: { $ne: null } }
                ]
            };

            if (topicId) {
                filter.topicId = topicId;
            }

            const topicIdsMapped = topicIds?.split(',');
            if (Array.isArray(topicIdsMapped) && topicIdsMapped.length > 0) {
                filter.topicId = { $in: topicIdsMapped };
            }

            const [rows, count] = await em.findAndCount(
                TopicCache,
                filter,
                options
            );

            const result = {
                items: rows?.map((item: TopicCache) => { return {
                    topicId: item.topicId,
                    priorityDate: item.priorityDate,
                    priorityStatusDate: item.priorityStatusDate,
                    priorityStatus: item.priorityStatus as PriorityStatus,
                    lastUpdate: item.lastUpdate,
                    hasNext: item.hasNext
                } }) || [],
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
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

            const row = (await em.findOne(
                TopicCache,
                {
                    topicId: { $in: topicIds }
                },
            ))

            if (!row || !!row.priorityDate) {
                return new MessageResponse(false);
            }

            await em.nativeUpdate(TopicCache, { topicId: { $in: topicIds } }, {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
            });
            
            return new MessageResponse(true);
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

            const row = (await em.findOne(
                TokenCache,
                {
                    tokenId: { $in: tokenIds }
                },
            ))

            if (!row || !!row.priorityDate) {
                return new MessageResponse(false);
            }

            await em.nativeUpdate(TokenCache, { tokenId: { $in: tokenIds } }, {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
            });
            
            return new MessageResponse(true);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
