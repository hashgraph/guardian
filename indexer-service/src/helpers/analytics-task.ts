import { CronJob } from 'cron';
import { SynchronizationPolicy } from './synchronizers/synchronize-policy.js';
import { SynchronizationVCs } from './synchronizers/synchronize-vcs.js';
import { SynchronizationVPs } from './synchronizers/synchronize-vp.js';
import { SynchronizationTask } from './synchronization-task.js';
import { IPFS_CID_PATTERN, MessageAction, MessageType, PriorityStatus } from '@indexer/interfaces';
import { DataBaseHelper, Message, MessageCache, PriorityQueue } from '@indexer/common';
import { textSearch } from './text-search-options.js';
import { fastLoadFiles } from './load-files.js';

function getMask(mask: string | undefined): string {
    return (mask || '0 * * * *');
}

/**
 * Synchronization task
 */
export class AnalyticsTask {

    /**
     * Cron job
     */
    private _job?: CronJob;

    public static EVENTS_SET: Set<number> = new Set();
    public static EVENTS_QUEUE: number[] = [];

    private static MASK: string = '* * * * *';

    private readonly synchronizationVCs: SynchronizationVCs;
    private readonly synchronizationVPs: SynchronizationVPs;
    private readonly synchronizationPolicy: SynchronizationPolicy;

    private isSyncRunning = new Map<string, boolean>();

    constructor() {
        this.synchronizationVCs = (new SynchronizationVCs(""));
        this.synchronizationVPs = (new SynchronizationVPs(""));
        this.synchronizationPolicy = (new SynchronizationPolicy(""));

        this.isSyncRunning.set(this.synchronizationVCs.name, false);
        this.isSyncRunning.set(this.synchronizationVPs.name, false);
        this.isSyncRunning.set(this.synchronizationPolicy.name, false);
    }

    public static create() {
        AnalyticsTask.EVENTS_SET = new Set<number>();
        AnalyticsTask.EVENTS_QUEUE = [];

        // todo setup queue from db
        (new AnalyticsTask()).start();
    }

    public start() { 
        const taskExecution = async () => {
            try {
                console.log('Analytic job started');
                this.startSync()
            } catch (error) {
                console.error('Analytic synchronization failed:', error);
            }
        };
        
        this._job = new CronJob(AnalyticsTask.MASK, taskExecution);
        this._job.start();

        taskExecution();
    }

    public stop() {
        this._job?.stop();
    }

    public static onAddEvent(priorityTimestamp: number) { // to string
        if (!AnalyticsTask.EVENTS_SET.has(priorityTimestamp)) {
            AnalyticsTask.EVENTS_SET.add(priorityTimestamp);
            AnalyticsTask.EVENTS_QUEUE.push(priorityTimestamp);
        }
    }

    public async startSync() {
        if (AnalyticsTask.EVENTS_QUEUE.length > 0 &&
            !this.isSyncRunning.get(this.synchronizationVCs.name) &&
            !this.isSyncRunning.get(this.synchronizationVPs.name) &&
                !this.isSyncRunning.get(this.synchronizationPolicy.name)) {
            
            const timestamp = AnalyticsTask.EVENTS_QUEUE.shift();
            AnalyticsTask.EVENTS_SET.delete(timestamp);

            console.log(`Processing event (timestamp): ${timestamp}`);

            this.updateVCsAnalytics(timestamp);

            // await this.runTask(this.synchronizationVCs);
            await this.runTask(this.synchronizationVPs);
            await this.runTask(this.synchronizationPolicy);

            const em = DataBaseHelper.getEntityManager();
            await em.nativeUpdate(PriorityQueue, {
                priorityTimestamp: timestamp,
            }, {
                priorityStatus: PriorityStatus.FINISHED
            });
            console.log(`Analytics synchronization finished!`);

        } else if (AnalyticsTask.EVENTS_QUEUE.length > 0) {
            console.log(`Already running analytic synchronization`);
        }
    };

    private async runTask(task: SynchronizationTask) {

        this.isSyncRunning.set(task.taskName, true);

        console.log(`${task.taskName} task is started`);
        try {
            console.time(`----- sync ${task.taskName} -----`);
            await task.sync();
            console.timeEnd(`----- sync ${task.taskName} -----`);
        } catch (error) {
            console.log(error);
        }
        console.log(`${task.taskName} task is finished`);

        this.isSyncRunning.set(task.taskName, false);
    }

    private async updateVCsAnalytics(priorityTimestamp: number): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const messageCacheCollection = em.getCollection<MessageCache>('MessageCache');
        
        const messageCache = messageCacheCollection.find({
            type: MessageType.VC_DOCUMENT,
            priorityTimestamp
        });
            
        const consensusTimestamps = new Set<string>();

        while (await messageCache.hasNext()) {
            const row = await messageCache.next();
            consensusTimestamps.add(row.consensusTimestamp);
        }

        const messageCollection = em.getCollection<Message>('Message');

        const messages = messageCollection.find({
            type: MessageType.VC_DOCUMENT,
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });

        const messagesResult: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        const schemaFileIds: Set<string> = new Set<string>();
        const topicIds: Set<string> = new Set<string>();
        const schemaContextCIDs: Set<string> = new Set<string>();

        const policyMap = new Map<string, Message>();
        const topicMap = new Map<string, Message>();
        const schemaMap = new Map<string, Message>();

        while (await messages.hasNext()) {
            const message = await messages.next();
            messagesResult.push(message);
            fileIds.add(message.files?.[0]);
            topicIds.add(message.topicId);
        }

        const fileMap = await fastLoadFiles(fileIds);

        for (const buffer of fileMap.values()) {
            const documentFile = this.parseFile(buffer);
            const subject = this.getSubject(documentFile);
            if (subject) {
                const schemaContextCID = this.getContext(documentFile);
                schemaContextCIDs.add(schemaContextCID);
            }
        }

        const policies = messageCollection.find({
            type: MessageType.INSTANCE_POLICY,
            'options.instanceTopicId': { $in: Array.from(topicIds) }
        });
        
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }

        const topics = messageCollection.find({
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic,
            'options.parentId': { $in: Array.from(topicIds) }
        });

        while (await topics.hasNext()) {
            const topic = await topics.next();
            if (!topic.options?.childId) {
                topicMap.set(topic.topicId, topic);
            }
        }
        
        const schemas = messageCollection.find({
            type: MessageType.SCHEMA,
            files: { $in: Array.from(schemaContextCIDs) }
        });

        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            if (schema.files) {
                if (schema.files[0]) {
                    schemaFileIds.add(schema.files[0]);
                }
                if (schema.files[0]) {
                    schemaMap.set(schema.files[0], schema);
                }
                if (schema.files[1]) {
                    schemaMap.set(schema.files[1], schema);
                }
            }
        }

        const schemaFileMap = await fastLoadFiles(schemaFileIds);

        for (const document of messagesResult) {
            console.log(`Sync VCs: update data`);
            const row = em.getReference(Message, document._id);
            row.analytics = this.createVCAnalytics(document, policyMap, topicMap, schemaMap, fileMap, schemaFileMap);
            row.analyticsUpdate = Date.now();
            em.persist(row);
        }

        console.log(`Sync VCs: flush`)
        await em.flush();
    }

    private createVCAnalytics(
        document: Message,
        policyMap: Map<string, Message>,
        topicMap: Map<string, Message>,
        schemaMap: Map<string, Message>,
        fileMap: Map<string, string>,
        schemaFileMap: Map<string, string>
    ): any {
        const documentAnalytics: any = {
            textSearch: textSearch(document),
        };
        let policyMessage = policyMap.get(document.topicId);
        if (!policyMessage) {
            const projectTopic = topicMap.get(document.topicId);
            if (projectTopic) {
                policyMessage = policyMap.get(projectTopic.options.parentId);
            }
        }
        if (policyMessage) {
            documentAnalytics.policyId = policyMessage.consensusTimestamp;
            documentAnalytics.textSearch += `|${policyMessage.consensusTimestamp}`;
        }
        if (Array.isArray(document.files) && document.files.length > 0) {
            const documentFileId = document.files[0];
            const documentFileString = fileMap.get(documentFileId);
            const documentFile = this.parseFile(documentFileString);
            const subject = this.getSubject(documentFile);
            if (!subject) {
                return documentAnalytics;
            }
            const documentFields = new Set<string>();
            this.parseDocumentFields(subject, documentFields);
            if (documentFields.size > 0) {
                documentAnalytics.textSearch += `|${[...documentFields].join('|')}`;
            }

            const schemaContextCID = this.getContext(documentFile);
            if (schemaContextCID) {
                const schemaMessage = schemaMap.get(schemaContextCID);
                if (schemaMessage) {
                    documentAnalytics.schemaId = schemaMessage.consensusTimestamp;
                    const schemaDocumentFileString = schemaFileMap.get(schemaMessage.files?.[0]);
                    const schemaDocumentFile = this.parseFile(schemaDocumentFileString);
                    if (schemaDocumentFile?.title) {
                        documentAnalytics.schemaName = schemaDocumentFile.title;
                        documentAnalytics.textSearch += `|${schemaDocumentFile.title}`;
                    }
                }
            }
        }
        return documentAnalytics;
    }

    private parseFile(file: string | undefined): any | null {
        try {
            if (file) {
                return JSON.parse(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    private getSubject(documentFile: any): any {
        if (documentFile && documentFile.credentialSubject) {
            return documentFile.credentialSubject[0] || documentFile.credentialSubject
        }
        return null;
    }
    
    private getContext(documentFile: any): any {
        let contexts = documentFile['@context'];
        contexts = Array.isArray(contexts) ? contexts : [contexts];
        for (const context of contexts) {
            if (typeof context === 'string') {
                const matches = context?.match(IPFS_CID_PATTERN);
                const contextCID = matches && matches[0];
                if (contextCID) {
                    return contextCID;
                }
            }
        }
        return null;
    }

    private parseDocumentFields(document: any, fieldValues: Set<string>): void {
        const stack = [document];
        while (stack.length > 0) {
            const doc = stack.pop();
            for (const field in doc) {
                if (Object.prototype.toString.call(field) === '[object Object]') {
                    stack.push(doc[field]);
                } else {
                    fieldValues.add(doc[field].toString());
                }
            }
        }
    }
}
