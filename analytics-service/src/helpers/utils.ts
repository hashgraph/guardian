import { DataBaseHelper, Workers } from '@guardian/common';
import { WorkerTaskType } from '@guardian/interfaces';
import { AnalyticsStatus as Status } from '@entity/analytics-status';
import { AnalyticsTopicCache as TopicCache } from '@entity/analytics-topic-cache';
import { ReportStatus } from '@interfaces/report-status.type';
import { ReportSteep } from '@interfaces/report-steep.type';

/**
 * Utils
 */
export class AnalyticsUtils {
    /**
     * Update report progress
     * @param report
     * @param max
     */
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

    /**
     * Update report status
     * @param report
     * @param steep
     * @param status
     */
    public static async updateStatus(
        report: Status,
        steep: ReportSteep,
        status: ReportStatus
    ): Promise<Status> {
        report.steep = steep;
        report.status = status;
        return await new DataBaseHelper(Status).save(report);
    }

    /**
     * Get topic cache
     * @param uuid
     * @param topicId
     * @param skip
     */
    public static async getTopicCache(
        uuid: string,
        topicId: string,
        skip: boolean = false
    ): Promise<TopicCache | null> {
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

    /**
     * Update topic cache
     * @param topicCache
     */
    public static async updateTopicCache(topicCache: TopicCache): Promise<TopicCache> {
        return await new DataBaseHelper(TopicCache).save(topicCache);
    }

    /**
     * Load messages
     * @param topic
     */
    public static async loadMessages(topic: TopicCache): Promise<any> {
        const messages = [];
        try {
            console.log('load:', topic.topicId);
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
                    console.log('next:', next, topic.topicId, messages.length);
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

    /**
     * Load message
     * @param timeStamp
     */
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

    /**
     * Compress messages
     * @param messages
     */
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

    /**
     * Load messages and update cache
     * @param report
     * @param topicId
     * @param skip
     * @param callback
     */
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

    /**
     * Calculate rate
     * @param array
     * @param field
     * @param size
     */
    public static topRateByCount(
        array: any[],
        field: string,
        size: number
    ): any[] {
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
            result.push({ name, value: count });
        }
        result.sort((a, b) => a.value > b.value ? -1 : 1);
        return result.splice(0, size);
    }

    /**
     * Calculate rate
     * @param array
     * @param size
     */
    public static topRateByValue(
        array: any[],
        size: number
    ): any[] {
        return array
            .sort((a: any, b: any) => a.value > b.value ? -1 : 1)
            .slice(0, size);
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
