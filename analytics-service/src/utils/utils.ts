import { DataBaseHelper, Workers } from '@guardian/common';
import { GenerateUUIDv4, WorkerTaskType } from '@guardian/interfaces';
import { AnalyticsTopicCache as TopicCache } from '../entity/analytics-topic-cache';
import { AnalyticsStatus as Status } from '../entity/analytics-status';
import { ReportSteep } from '../interfaces/report-steep.type';
import { ReportStatus } from '../interfaces/report-status.type';

export class AnalyticsUtils {
    public static async updateProgress(
        report: Status,
        max?: number,
    ): Promise<Status> {
        if (max) {
            report.maxProgress = max;
            report.progress = 0;
        } else {
            report.progress++;
        }
        return await new DataBaseHelper(Status).save(report);
    }

    public static async updateStatus(
        report: Status,
        steep: ReportSteep,
        status: ReportStatus
    ): Promise<Status> {
        report.steep = steep;
        report.status = status;
        return await new DataBaseHelper(Status).save(report);
    }

    public static async getTopicCache(uuid: string, topicId: string, skip: boolean = false): Promise<TopicCache | null> {
        if (!topicId) {
            return null;
        }
        const topicCache = await new DataBaseHelper(TopicCache).findOne({ uuid, topicId });
        if (topicCache) {
            if (skip && !topicCache.error) {
                return null;
            }
            return topicCache;
        } else {
            return new DataBaseHelper(TopicCache).create({
                uuid,
                topicId,
                index: 0
            });
        }
    }

    public static async updateTopicCache(topicCache: TopicCache): Promise<TopicCache> {
        return await new DataBaseHelper(TopicCache).save(topicCache);
    }

    public static async loadMessages(topic: TopicCache): Promise<any> {
        const messages = [];
        try {
            console.log('load: ', topic.topicId, topic.timeStamp);
            const workers = new Workers();
            let next: string = null;
            do {
                const data = await workers.addRetryableTask({
                    type: WorkerTaskType.GET_TOPIC_MESSAGE_CHUNKS,
                    data: {
                        topic: topic.topicId,
                        timeStamp: topic.timeStamp,
                        next
                    }
                }, 15, 5);
                for (const message of data.messages) {
                    messages.push(message);
                }
                next = data.next;
                if (next) {
                    console.log('next: ', next, topic.topicId, messages.length);
                }
            } while (next);
            return { messages };
        } catch (e) {
            const error = String(e)
            if (error === 'Invalid parameter: topic.id') {
                return { messages: [] };
            }
            return { messages, error };
        }
    }

    public static async loadMessage(timeStamp: string): Promise<any> {
        try {
            const workers = new Workers();
            const message = await workers.addRetryableTask({
                type: WorkerTaskType.GET_TOPIC_MESSAGE,
                data: {
                    timeStamp
                }
            }, 10);
            return { message };
        } catch (error) {
            return { message: null, error };
        }
    }

    public static async compressMessages(messages: any[]): Promise<any[]> {
        const result = [];
        const map = new Map<string, any>();
        for (const message of messages) {
            if (message.chunk_total > 1 && message.chunk_id) {
                let store = map.get(message.chunk_id);
                if (!store) {
                    store = {
                        root: null,
                        chunks: new Array(message.chunk_total),
                        error: false
                    }
                    map.set(message.chunk_id, store);
                }
                if (message.chunk_number === 1) {
                    result.push(message);
                    store.root = message;
                }
                store.chunks[message.chunk_number - 1] = message.message;
                if (typeof message.message !== 'string') {
                    store.error = true;
                }
            } else {
                result.push(message);
            }
        }
        for (const store of map.values()) {
            if (store.root) {
                if (store.error) {
                    store.root.message = null;
                } else {
                    store.root.message = store.chunks.join('');
                }
            }
        }
        return result;
    }

    public static async searchMessages(
        report: Status,
        topicId: string,
        skip: boolean = false,
        callback: (message: any) => Promise<void>
    ): Promise<Status> {
        if (!topicId) {
            return report;
        }

        const topicCache = await AnalyticsUtils.getTopicCache(report.uuid, topicId, skip);
        if (!topicCache) {
            return report;
        }

        let { messages, error } = await AnalyticsUtils.loadMessages(topicCache);
        messages = await AnalyticsUtils.compressMessages(messages);

        let lastTimeStamp = topicCache.timeStamp;
        let lastIndex = topicCache.index;
        try {
            for (const message of messages) {
                await callback(message);
                lastTimeStamp = message.id;
                lastIndex = message.sequence_number;
            }
        } catch (e) {
            console.log(e);
            error = e;
        }
        topicCache.timeStamp = lastTimeStamp;
        topicCache.index = lastIndex;
        await AnalyticsUtils.updateTopicCache(topicCache);

        if (error) {
            throw error;
        }

        return report;
    }

    /**
     * Get token information
     * @param tokenId
     */
    public static async getTokenInfo(tokenId: string): Promise<any> {
        const workers = new Workers();
        const info = await workers.addRetryableTask({
            type: WorkerTaskType.GET_TOKEN_INFO,
            data: { tokenId }
        }, 10);
        return info;
    }

    public static topRate(array: any[], field: string, count: number): any[] {
        const map = new Map();
        for (const p of array) {
            const key = (p[field] || '');
            if (map.has(key)) {
                map.set(key, map.get(key) + 1);
            } else {
                map.set(key, 1);
            }
        }
        const result: any[] = [];
        for (const [name, count] of map.entries()) {
            result.push({ name, count });
        }
        result.sort((a, b) => a.count > b.count ? -1 : 1);
        return result.splice(0, count);
    }

    /**
     * Split chunk
     * @param array
     * @param chunk
     */
    public static splitChunk<T>(array: T[], chunk: number): T[][] {
        const res: T[][] = [];
        let i: number;
        let j: number;
        for (i = 0, j = array.length; i < j; i += chunk) {
            res.push(array.slice(i, i + chunk));
        }
        return res;
    }

    /**
     * Split chunk
     * @param array
     * @param chunk
     */
    public static unique<T>(array: T[], key: string): T[] {
        const map = new Set<string>();
        const result: T[] = [];
        for (const item of array) {
            if (!map.has(item[key])) {
                result.push(item);
                map.add(item[key]);
            }
        }
        return result;
    }
}
