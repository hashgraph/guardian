import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    AnyResponse,
    DataBaseHelper,
    Message,
    MessageCache,
    MessageError,
    TopicCache,
    TokenCache,
    Environment,
    TopicInfo,
    PriorityQueue,
} from '@indexer/common';
import {
    DataLoadingProgress,
    DataPriorityLoadingProgress,
    MessageType,
    Page,
    PageFilters,
    PriorityStatus,
} from '@indexer/interfaces';
import { parsePageParams } from '../utils/parse-page-params.js';
import axios from 'axios';
import { AnalyticsTask } from '../helpers/analytics-task.js';
import { MongoEntityManager } from '@mikro-orm/mongodb';

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

            const filters: any = {};
            if (ids.length > 0) {
                filters.entityId = { $in: ids };
            }

            const [rows, count] = await em.findAndCount(PriorityQueue, filters, options);

            const result = {
                items: rows?.map((item: PriorityQueue) => {
                    return {
                        type: item.type,
                        entityId: item.entityId,
                        priorityDate: new Date(item.priorityTimestamp),
                        priorityStatusDate: item.priorityStatusDate,
                        priorityStatus: item.priorityStatus as PriorityStatus
                    }
                }) || [],
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

            let result = false;

            for (const id of topicIds) {
                const priorityTimestamp = Date.now();

                if (await this.checkQueue(id)) {
                    const topicResult = await this.addTopic(id, priorityTimestamp);

                    if (topicResult) {
                        await this.createQueue(id, priorityTimestamp, 'Topic');
                        result = true;
                    }
                }
            }

            return new MessageResponse(result);
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

            let result = false;

            for (const id of policyTopicIds) {
                const priorityTimestamp = Date.now();
                if (await this.checkQueue(id)) {
                    const topicResult = await this.addInstancePolicy(id, priorityTimestamp);

                    if (topicResult) {
                        await this.createQueue(id, priorityTimestamp, 'Topic');
                        result = true;
                    }
                }
            }

            return new MessageResponse(result);
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

            let result = false;

            for (const id of tokenIds) {
                const priorityTimestamp = Date.now();
                if (await this.checkQueue(id)) {
                    const topicResult = await this.addToken(id, priorityTimestamp);

                    if (topicResult) {
                        await this.createQueue(id, priorityTimestamp, 'Token');
                        result = true;
                    }
                }
            }

            return new MessageResponse(result);
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

            const priorityTimestamp = Date.now();
            if (await this.checkQueue(entityId)) {
                const entityResult = await this.addEntity(entityId, priorityTimestamp);

                if (entityResult) {
                    await this.createQueue(entityId, priorityTimestamp, 'Topic');
                    return new MessageResponse(true);
                }
            }

            return new MessageResponse(false);

        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.ON_PRIORITY_DATA_LOADED)
    async onPriorityDataLoaded(msg:
        {
            priorityTimestamp: number
        }
    ) {
        setTimeout(() =>  this.updatePriorityQueue(msg.priorityTimestamp).then(), 10000)
    }

    private async updatePriorityQueue(priorityTimestamp: number) {
        try {
            const em = DataBaseHelper.getEntityManager();

            const priorityQueueItem = await em.findOne(PriorityQueue, { priorityTimestamp });
            if (!priorityQueueItem) {
                return;
            }

            const { status, isFinished } = await this.getPriorityStatusFromCaches(
                em,
                priorityTimestamp,
                priorityQueueItem.priorityStatus as PriorityStatus
            );

            if (isFinished) {
                AnalyticsTask.onAddEvent(priorityTimestamp);

                await em.nativeUpdate(PriorityQueue, {
                    priorityTimestamp: priorityTimestamp,
                }, {
                    priorityStatus: PriorityStatus.ANALYTICS
                });
            } else {
                await em.nativeUpdate(PriorityQueue, {
                    priorityTimestamp: priorityTimestamp,
                }, {
                    priorityStatus: status
                });
            }
        } catch (error) {
            console.log('updatePriorityQueue error:', error);
        }
    }

    public async updateAllPriorityQueue() {
        console.log('started updating the entire priority queue');

        try {
            const em = DataBaseHelper.getEntityManager();
            const queueCollection = em.getCollection<PriorityQueue>('PriorityQueue');

            const priorityQueue = queueCollection.find({ priorityStatus: { $ne: PriorityStatus.FINISHED } });

            while (await priorityQueue.hasNext()) {
                const priorityQueueItem = await priorityQueue.next();
                const priorityTimestamp = priorityQueueItem.priorityTimestamp;

                const { status, isFinished } = await this.getPriorityStatusFromCaches(
                    em,
                    priorityTimestamp,
                    priorityQueueItem.priorityStatus as PriorityStatus
                );

                if (isFinished) {
                    await em.nativeUpdate(PriorityQueue, {
                        priorityTimestamp: priorityTimestamp,
                    }, {
                        priorityStatus: PriorityStatus.ANALYTICS
                    });
                } else {
                    if ((Date.now() - priorityQueueItem.priorityTimestamp) > 24 * 60 * 60 * 1000) {
                        await this.addEntity(priorityQueueItem.entityId, priorityTimestamp);
                        await em.nativeUpdate(PriorityQueue, {
                            priorityTimestamp: priorityTimestamp,
                        }, {
                            priorityStatus: PriorityStatus.SCHEDULED
                        });
                    } else {
                        await em.nativeUpdate(PriorityQueue, {
                            priorityTimestamp: priorityTimestamp,
                        }, {
                            priorityStatus: status
                        });
                    }
                }
            }
        } catch (error) {
            console.log('updateAllPriorityQueue error:', error);
        }
    }

    private async addTopic(topicId: string, priorityTimestamp: number = Date.now()) {
        const em = DataBaseHelper.getEntityManager();

        const topicResult = await em.nativeUpdate(TopicCache, {
            topicId: topicId,
            priorityTimestamp: { $ne: priorityTimestamp }
        },
            {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
                priorityTimestamp
            }
        );

        const messageResult = await em.nativeUpdate(MessageCache, {
            topicId: topicId,
            priorityTimestamp: { $ne: priorityTimestamp }
        },
            {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
                priorityTimestamp
            }
        );

        return (topicResult + messageResult) > 0;
    }

    private async addToken(tokenId: string, priorityTimestamp: number = Date.now()) {
        const em = DataBaseHelper.getEntityManager();

        const result = await em.nativeUpdate(TokenCache, {
            tokenId,
            priorityTimestamp: { $ne: priorityTimestamp }
        },
            {
                priorityDate: new Date(),
                priorityStatus: PriorityStatus.SCHEDULED,
                priorityStatusDate: new Date(),
                priorityTimestamp,
            }
        );

        return result != 0;
    }

    private async addPolicy(policyId: string, priorityTimestamp: number = Date.now()) {
        const em = DataBaseHelper.getEntityManager();

        const row = await em.find(
            Message,
            {
                type: MessageType.TOPIC,
                'options.childId': policyId,
                'options.messageType': 'POLICY_TOPIC'
            } as any,
        )

        if (row) {
            const policyInstances = await em.find(
                Message,
                {
                    type: MessageType.INSTANCE_POLICY,
                    topicId: policyId,
                } as any,
            )

            let policyInstancesResult = false;
            for (const item of policyInstances) {
                policyInstancesResult ||= await this.addInstancePolicy(item.options.instanceTopicId, priorityTimestamp);
            }

            return policyInstancesResult;
        }

        return false;
    }

    private async addInstancePolicy(policyId: string, priorityTimestamp: number = Date.now()) {
        const em = DataBaseHelper.getEntityManager();

        const priorityDate = new Date();

        const row = await em.find(
            Message,
            {
                type: MessageType.INSTANCE_POLICY,
                'options.instanceTopicId': policyId
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

        const topicResult = await em.nativeUpdate(TopicCache, { topicId: { $in: Array.from(topicIds) }, priorityTimestamp: { $ne: priorityTimestamp } }, {
            priorityDate: priorityDate,
            priorityStatus: PriorityStatus.SCHEDULED,
            priorityStatusDate: priorityDate,
            priorityTimestamp
        });

        const tokenResult = await em.nativeUpdate(TokenCache, { tokenId: { $in: Array.from(tokenIds) }, priorityTimestamp: { $ne: priorityTimestamp } }, {
            priorityDate: priorityDate,
            priorityStatus: PriorityStatus.SCHEDULED,
            priorityStatusDate: priorityDate,
            priorityTimestamp
        });

        const messageResult = await em.nativeUpdate(MessageCache, {
            topicId: { $in: Array.from(topicIds) },
            priorityTimestamp: { $ne: priorityTimestamp }
        },
            {
                priorityDate: new Date(),
                priorityTimestamp,
                priorityStatusDate: priorityDate,
                priorityStatus: PriorityStatus.SCHEDULED,
            }
        );

        return (topicResult + tokenResult + messageResult) > 0;
    }

    private async addEntity(entityId: string, priorityTimestamp: number = Date.now()) {
        if (await this.addPolicy(entityId, priorityTimestamp)) {
            return true;
        }

        if (await this.addInstancePolicy(entityId, priorityTimestamp)) {
            return true;
        }

        if (await this.addTopic(entityId, priorityTimestamp)) {
            return true;
        }

        if (await this.addToken(entityId, priorityTimestamp)) {
            return true;
        }

        return await this.trySetPriorityFromHedera(entityId, priorityTimestamp);
    }

    private async trySetPriorityFromHedera(entityId: string, priorityTimestamp: number, parentIds: Set<string> = new Set<string>(), depth: number = 0) {
        if (depth >= 10) {
            console.log("Recursion limit reached: ", depth);
            return false;
        }

        if (parentIds.has(entityId)) {
            console.log("Recursion already touched: ", entityId);
            return false;
        }

        parentIds.add(entityId);

        try {
            const url = LoadingQueueService.mirrorNodeUrl + 'topics/' + entityId + '/messages';
            const option: any = {
                params: {
                    limit: 2
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
                        const cacheResult = await this.addEntity(message.parentId, priorityTimestamp);

                        if (cacheResult) {
                            return cacheResult;
                        }

                        return await this.trySetPriorityFromHedera(message.parentId, priorityTimestamp, parentIds, depth + 1);
                    }
                }
            } else {
                return false;
            }
        } catch (error) {
            console.log('Try set priority from Hedera error: ', entityId, error.message);
            return false;
        }
    }

    private async createQueue(entityId: string, priorityTimestamp: number, type: 'Topic' | 'Token') {
        const em = DataBaseHelper.getEntityManager();

        const row = em.create(PriorityQueue, {
            type,
            entityId,
            priorityTimestamp,
            priorityStatusDate: new Date(priorityTimestamp),
            priorityStatus: PriorityStatus.SCHEDULED
        });
        em.persist(row);
        await em.flush();
    }

    private async checkQueue(entityId: string) {
        return true;
        // const em = DataBaseHelper.getEntityManager();

        // const row = await em.findOne(PriorityQueue, {
        //     entityId
        // });

        // return !row || row.priorityStatus === PriorityStatus.FINISHED;
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

    private async getPriorityStatusFromCaches(
        em: MongoEntityManager,
        priorityTimestamp: number,
        initialStatus: PriorityStatus
    ): Promise<{ status: PriorityStatus; isFinished: boolean }> {

        const filters = { priorityTimestamp };
        const options = { projection: { _id: 1 } };

        let status: PriorityStatus = initialStatus;
        let isFinished = true;

        const collections = [
            em.getCollection(TopicCache),
            em.getCollection(TokenCache),
            em.getCollection(MessageCache),
        ];

        for (const collection of collections) {
            const notFinished = await collection.findOne(
                { ...filters, priorityStatus: { $ne: PriorityStatus.FINISHED } },
                options
            );

            if (notFinished) {
                isFinished = false;
            }

            if (status !== PriorityStatus.RUNNING) {
                const hasStatus = await collection.findOne(
                    { ...filters, priorityStatus: { $in: [PriorityStatus.RUNNING, PriorityStatus.FINISHED] } },
                    options
                );
                if (hasStatus) {
                    status = PriorityStatus.RUNNING;
                }
            }
        }

        return { status, isFinished };
    }
}
