import { DataBaseHelper, Workers } from '@guardian/common';
import { WorkerTaskType } from '@guardian/interfaces';
import { AnalyticsStatus as Status } from '../entity/analytics-status.js';
import { AnalyticsTopicCache as TopicCache } from '../entity/analytics-topic-cache.js';
import { ReportStatus } from '../interfaces/report-status.type.js';
import { ReportSteep } from '../interfaces/report-steep.type.js';

class Counter {
    private count: number;
    private last: number;
    private lastCount: number;

    constructor() {
        this.last = Date.now();
        this.count = 0;
        this.lastCount = 0;
    }

    public add(): void {
        this.count++;
        const current = Date.now();
        if (current - this.last > 60000) {
            console.log(`Requests: ${this.count - this.lastCount} per minute.`);
            this.last = current;
            this.lastCount = this.count;
        }
    }
}

export class TaskQueue {
    /**
     * Limit
     */
    private limit: number;
    /**
     * Tasks
     */
    private readonly tasks: ((value: number) => void)[];

    constructor() {
        this.tasks = [];
        setInterval(this.onTask.bind(this), 1000);
    }

    /**
     * Get id
     * @param report
     * @param max
     */
    public getId(limit: number): Promise<number> {
        this.limit = limit;
        return new Promise<number>((resolve, reject) => {
            this.tasks.push(resolve);
        });
    }

    /**
     * onTask
     */
    private onTask(): void {
        if (this.tasks.length && this.limit) {
            const length = Math.min(this.tasks.length, this.limit)
            for (let i = 0; i < length; i++) {
                this.tasks.shift()(i);
            }
        }
    }
}

/**
 * Analytics debug
 */
export enum AnalyticsDebug {
    NONE = 0, // 0
    MESSAGES = 1, // 1 << 0
    REQUESTS = 2 // 1 << 1
}

/**
 * Utils
 */
export class AnalyticsUtils {
    /**
     * Debug level
     */
    public static DEBUG_LVL: number = AnalyticsDebug.NONE;
    /**
     * Request count limit per second
     */
    public static REQUEST_LIMIT: number = 40;
    /**
     * Request counter
     */
    private static readonly counter = new Counter();
    /**
     * Request counter
     */
    private static readonly taskQueue = new TaskQueue();

    /**
     * Send debug message
     * @param message
     * @param lvl
     */
    private static debugMessage(message: string, lvl: AnalyticsDebug): void {
        try {
            // tslint:disable-next-line:no-bitwise
            if (lvl & AnalyticsUtils.DEBUG_LVL) {
                if (lvl === AnalyticsDebug.MESSAGES) {
                    console.log(message);
                }
                if (lvl === AnalyticsDebug.REQUESTS) {
                    AnalyticsUtils.counter.add();
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

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
            AnalyticsUtils.debugMessage(`Load topic: ${topic.topicId}`, AnalyticsDebug.MESSAGES);
            const workers = new Workers();
            let next: string = null;
            do {
                await AnalyticsUtils.taskQueue.getId(AnalyticsUtils.REQUEST_LIMIT);
                AnalyticsUtils.debugMessage('Request count', AnalyticsDebug.REQUESTS);
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
                    AnalyticsUtils.debugMessage(`Next messages: ${next}, ${topic.topicId}, ${messages.length}`, AnalyticsDebug.MESSAGES);
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
            AnalyticsUtils.debugMessage(`Load message: ${timeStamp}`, AnalyticsDebug.MESSAGES);
            const workers = new Workers();
            await AnalyticsUtils.taskQueue.getId(AnalyticsUtils.REQUEST_LIMIT);
            AnalyticsUtils.debugMessage('Request count', AnalyticsDebug.REQUESTS);
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
        AnalyticsUtils.debugMessage(`Load token: ${tokenId}`, AnalyticsDebug.MESSAGES);
        const workers = new Workers();
        await AnalyticsUtils.taskQueue.getId(AnalyticsUtils.REQUEST_LIMIT);
        AnalyticsUtils.debugMessage('Request count', AnalyticsDebug.REQUESTS);
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
