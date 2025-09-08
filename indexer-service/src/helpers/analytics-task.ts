import { CronJob } from 'cron';
import { SynchronizationPolicy } from './synchronizers/synchronize-policy.js';
import { SynchronizationVCs } from './synchronizers/synchronize-vcs.js';
import { SynchronizationVPs } from './synchronizers/synchronize-vp.js';
import { IPFS_CID_PATTERN, MessageAction, MessageType, PolicyAnalytics, PriorityStatus, TokenType, VPAnalytics } from '@indexer/interfaces';
import { DataBaseHelper, Message, MessageCache, PriorityQueue, TokenCache } from '@indexer/common';
import { textSearch } from './text-search-options.js';
import { fastLoadFiles, fastLoadFilesBuffer } from './load-files.js';
import { Collection } from 'mongodb';
import { PolicyLoader, HashComparator } from '../analytics/index.js';
import { parsePolicyFile } from './parsers/policy.parser.js';
import { LoadingQueueService } from '../api/loading-queue.service.js';
import { SchemaFileHelper } from './schema-file-helper.js';
import { MongoDriver, MongoEntityManager } from '@mikro-orm/mongodb';

/**
 * Synchronization task
 */
export class AnalyticsTask {

    /**
     * Cron job
     */
    private _job?: CronJob;
    private _priority_check_job?: CronJob;

    public static EVENTS_SET: Set<number> = new Set();
    public static EVENTS_QUEUE: number[] = [];

    private static MASK: string = '* * * * *';
    private static PRIORITY_CHECK_QUEUE_MASK: string = '0 0 * * *';

    private readonly synchronizationVCs: SynchronizationVCs;
    private readonly synchronizationVPs: SynchronizationVPs;
    private readonly synchronizationPolicy: SynchronizationPolicy;

    private isSyncRunning = new Map<string, boolean>();

    constructor(private queueService: LoadingQueueService) {
        this.synchronizationVCs = (new SynchronizationVCs(""));
        this.synchronizationVPs = (new SynchronizationVPs(""));
        this.synchronizationPolicy = (new SynchronizationPolicy(""));

        this.isSyncRunning.set(this.synchronizationVCs.name, false);
        this.isSyncRunning.set(this.synchronizationVPs.name, false);
        this.isSyncRunning.set(this.synchronizationPolicy.name, false);
    }

    public static async create() {
        AnalyticsTask.EVENTS_SET = new Set<number>();
        AnalyticsTask.EVENTS_QUEUE = [];

        const em = DataBaseHelper.getEntityManager();
        const queue = await em.find(PriorityQueue, {
            priorityStatus: PriorityStatus.ANALYTICS
        });

        queue.forEach(item => {
            AnalyticsTask.EVENTS_QUEUE.push(item.priorityTimestamp);
        });

        (new AnalyticsTask(new LoadingQueueService)).start();
    }

    public start() {
        const taskExecution = async () => {
            try {
                this.startSync();
            } catch (error) {
                console.error('Analytic synchronization failed:', error);
            }
        };

        this._job = new CronJob(AnalyticsTask.MASK, taskExecution);
        this._job.start();

        taskExecution();

        const priorityCheckTaskExecution = async () => {
            try {
                this.queueService.updateAllPriorityQueue();
            } catch (error) {
                console.error('Analytic synchronization failed:', error);
            }
        };

        this._priority_check_job = new CronJob(AnalyticsTask.PRIORITY_CHECK_QUEUE_MASK, priorityCheckTaskExecution);
        this._priority_check_job.start();

        priorityCheckTaskExecution();
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

            await this.updateAnalytics(timestamp);

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

    private async updateAnalytics(priorityTimestamp: number): Promise<void> {
        const em = DataBaseHelper.getEntityManager();

        const messageCacheCollection = em.getCollection<MessageCache>('MessageCache');
        const messageCollection = em.getCollection<Message>('Message');
        const tokenCollection = em.getCollection<TokenCache>('token_cache');

        const consensusTimestamps = new Set<string>();

        const messageCache = messageCacheCollection.find({ priorityTimestamp });
        while (await messageCache.hasNext()) {
            const row = await messageCache.next();
            consensusTimestamps.add(row.consensusTimestamp);
        }

        const messages = messageCollection.find({
            type: { $in: [MessageType.VC_DOCUMENT, MessageType.VP_DOCUMENT] },
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });

        const messagesResult: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        while (await messages.hasNext()) {
            const message = await messages.next();
            messagesResult.push(message);
            fileIds.add(message.files?.[0]);
        }

        const fileMap = await fastLoadFiles(fileIds);
        const schemaFileIds: Set<string> = new Set<string>();
        const schemaContextCIDs: Set<string> = new Set<string>();
        const policyTopicIds: Set<string> = new Set<string>();

        for (const buffer of fileMap.values()) {
            const documentFile = this.parseFile(buffer);
            const subject = this.getSubject(documentFile);
            if (subject) {
                const schemaContext = SchemaFileHelper.getDocumentContext(documentFile);
                if (schemaContext) {
                    schemaContextCIDs.add(schemaContext.context);
                    schemaContextCIDs.add(schemaContext.context + '#' + schemaContext.type);
                }
            }
        }

        await this.unpackingSchemas(em, messageCollection, policyTopicIds);

        const topicMap = await this.loadTopics(messageCollection, consensusTimestamps, policyTopicIds);

        const policyMap = await this.loadPolicies(messageCollection, policyTopicIds);

        const schemaMap = await this.loadSchemas(messageCollection, schemaContextCIDs, schemaFileIds);
        const schemaFileMap = await fastLoadFiles(schemaFileIds);

        const labelDocumentMap = await this.loadLabelDocuments(messageCollection, consensusTimestamps);

        for (const document of messagesResult) {
            const row = em.getReference(Message, document._id);

            switch (document.type) {
                case MessageType.VC_DOCUMENT:
                    row.analytics = this.createVCAnalytics(document, policyMap, topicMap, schemaMap, fileMap, schemaFileMap);
                    row.analyticsUpdate = Date.now();
                    break;

                case MessageType.VP_DOCUMENT:
                    row.analytics = this.createVPAnalytics(document, policyMap, topicMap, schemaMap, fileMap, labelDocumentMap, schemaFileMap);
                    row.analyticsUpdate = Date.now();
                    break;

                default:
                    break;
            }

            em.persist(row);
        }

        const policyFileIds: Set<string> = new Set<string>();
        const parentTopicIds: Set<string> = new Set<string>();
        const policyTokenIds: Set<string> = new Set<string>();
        const allPolicies: Message[] = [];

        const policies = messageCollection.find({
            type: MessageType.INSTANCE_POLICY,
            action: MessageAction.PublishPolicy,
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            allPolicies.push(policy);
            policyFileIds.add(policy.files?.[0]);

            const topicDescription = topicMap.get(policy.topicId)?.[0];
            if (!topicDescription) {
                return;
            }
            const parentTopicId = topicDescription.options?.parentId;
            parentTopicIds.add(parentTopicId);
        }

        const policyFileMap = await fastLoadFilesBuffer(policyFileIds);
        for (const policyFileId of policyFileIds) {
            const policyFileBuffer = policyFileMap.get(policyFileId);
            if (!policyFileBuffer) {
                return;
            }
            const policyData = await parsePolicyFile(policyFileBuffer, false);
            if (!policyData) {
                return;
            }

            const tokens = policyData.tokens?.map((token: any) => token.tokenId as string) || [];

            tokens.forEach(tokenId => {
                policyTokenIds.add(tokenId);
            });
        }

        const policyTopicMap = await this.loadManyTopics(messageCollection, consensusTimestamps);
        const srMap = await this.loadSRs(messageCollection, parentTopicIds);
        const documentMap = await this.loadPolicyDocuments(messageCollection, consensusTimestamps);
        const tokenMap = await this.loadTokens(tokenCollection, policyTokenIds);

        for (const document of allPolicies) {
            const row = em.getReference(Message, document._id);
            row.analytics = await this.createPolicyAnalytics(
                document,
                policyTopicMap,
                srMap,
                documentMap,
                tokenMap,
                policyFileMap
            );
            row.analyticsUpdate = Date.now();
            em.persist(row);
        }

        console.log(`Sync Analytics: flush`)
        await em.flush();
    }

    //#region LOADING ENTITIES
    private async loadPolicies(collection: Collection<Message>, policyTopicIds: Set<string>) {
        console.log(`Sync Analytics: load policies`)
        const policyMap = new Map<string, Message>();
        const policies = collection.find({
            type: MessageType.INSTANCE_POLICY,
            topicId: { $in: Array.from(policyTopicIds) }
        });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }
        return policyMap;
    }

    private async loadTopics(collection: Collection<Message>, consensusTimestamps: Set<string>, policyTopicIds: Set<string>) {
        console.log(`Sync Analytics: load topics`)
        const topicMap = new Map<string, Message>();
        const topics = collection.find({
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic,
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });
        while (await topics.hasNext()) {
            const topic = await topics.next();
            if (!topic.options?.childId) {
                topicMap.set(topic.topicId, topic);
            }
            if (topic.options?.parentId) {
                policyTopicIds.add(topic.options.parentId);
            }
            if (topic.options?.childId) {
                policyTopicIds.add(topic.options.childId);
            }
        }

        return topicMap;
    }

    private async loadManyTopics(collection: Collection<Message>, consensusTimestamps: Set<string>) {
        console.log(`Sync Analytics: load policy topics`)
        const topicsMap = new Map<string, Message[]>();
        const policyTopics = collection.find({
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic,
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });
        while (await policyTopics.hasNext()) {
            const topic = await policyTopics.next();
            if (topicsMap.has(topic.topicId)) {
                topicsMap.get(topic.topicId).push(topic);
            } else {
                topicsMap.set(topic.topicId, [topic]);
            }
        }
        return topicsMap;
    }

    private async loadSchemas(
        collection: Collection<Message>,
        schemaContextCIDs: Set<string>,
        schemaFileIds: Set<string>
    ) {
        console.log(`Sync Analytics: load schemas`)
        const schemaMap = new Map<string, Message>();
        const schemas = collection.find({
            type: MessageType.SCHEMA,
            files: { $in: Array.from(schemaContextCIDs) }
        });
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const documentCID = SchemaFileHelper.getDocumentFile(schema);
            if (documentCID) {
                schemaFileIds.add(documentCID);
            }
            if (schema.files && schema.files[0]) {
                schemaMap.set(schema.files[0], schema);
            }
            if (schema.files && schema.files[1]) {
                schemaMap.set(schema.files[1], schema);
            }
        }
        return schemaMap;
    }

    private async loadLabelDocuments(collection: Collection<Message>, consensusTimestamps: Set<string>) {
        console.log(`Sync Analytics: load label documents`)
        const labels = collection.find({
            action: MessageAction.CreateLabelDocument,
            'options.target': { $in: Array.from(consensusTimestamps) }
        });
        const labelDocumentMap = new Map<string, string[]>();
        while (await labels.hasNext()) {
            const label = await labels.next();
            const refs = labelDocumentMap.get(label.options?.target) || [];
            refs.push(label.consensusTimestamp);
            labelDocumentMap.set(label.options?.target, refs);
        }
        return labelDocumentMap;
    }

    private async loadPolicyDocuments(collection: Collection<Message>, consensusTimestamps: Set<string>) {
        console.log(`Sync Analytics: load policy documents`)
        const documentMap = new Map<string, { vc: number, vp: number, evc: number }>();
        const documents = collection.find({
            type: { $in: [MessageType.VC_DOCUMENT, MessageType.EVC_DOCUMENT, MessageType.VP_DOCUMENT] },
            consensusTimestamp: { $in: Array.from(consensusTimestamps) }
        });
        while (await documents.hasNext()) {
            const document = await documents.next();
            let data: { vc: number, vp: number, evc: number };
            if (documentMap.has(document.topicId)) {
                data = documentMap.get(document.topicId);
            } else {
                data = { vc: 0, vp: 0, evc: 0 };
            }
            if (document.type === MessageType.VC_DOCUMENT) {
                data.vc++;
            } else if (document.type === MessageType.EVC_DOCUMENT) {
                data.evc++;
            } else {
                data.vp++;
            }
            documentMap.set(document.topicId, data);
        }
        return documentMap;
    }

    private async loadTokens(collection: Collection<TokenCache>, tokenIds: Set<string>) {
        console.log(`Sync Analytics: load tokens`)
        const tokenMap = new Map<string, TokenCache>();
        const tokens = collection.find({
            tokenId: { $in: Array.from(tokenIds) }
        });
        while (await tokens.hasNext()) {
            const token = await tokens.next();
            tokenMap.set(token.tokenId, token);
        }
        return tokenMap;
    }

    private async loadSRs(collection: Collection<Message>, parentTopicIds: Set<string>) {
        const srMap = new Map<string, Message>();
        const srs = collection.find({
            type: MessageType.STANDARD_REGISTRY,
            'options.registrantTopicId': { $in: Array.from(parentTopicIds) }
        });
        while (await srs.hasNext()) {
            const sr = await srs.next();
            if (sr.options?.registrantTopicId) {
                srMap.set(sr.options.registrantTopicId, sr);
            }
        }
        return srMap;
    }
    //#endregion

    //#region CREATING ANALYTICS
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

            const schemaContext = SchemaFileHelper.getDocumentContext(documentFile);
            if (schemaContext) {
                const schemaMessage = SchemaFileHelper.findInMap(schemaMap, schemaContext);
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

    private createVPAnalytics(
        document: Message,
        policyMap: Map<string, Message>,
        topicMap: Map<string, Message>,
        schemaMap: Map<string, Message>,
        fileMap: Map<string, string>,
        labelDocumentMap: Map<string, string[]>,
        schemaFileMap: Map<string, string>
    ): VPAnalytics {
        const documentAnalytics: VPAnalytics = {
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
            const vcs = this.getVcs(documentFile);
            if (vcs) {
                for (const vc of vcs) {
                    const subject = this.getSubject(vc);
                    if (subject) {
                        if (subject.type === 'MintToken') {
                            documentAnalytics.tokenId = subject.tokenId;
                            documentAnalytics.tokenAmount = subject.amount;
                        }
                        const documentFields = new Set<string>();
                        this.parseDocumentFields(subject, documentFields);
                        if (documentFields.size > 0) {
                            documentAnalytics.textSearch += `|${[...documentFields].join('|')}`;
                        }
                        const schemaContext = SchemaFileHelper.getDocumentContext(vc);
                        if (schemaContext) {
                            const schemaMessage = SchemaFileHelper.findInMap(schemaMap, schemaContext);
                            if (schemaMessage) {
                                if (!documentAnalytics.schemaIds) {
                                    documentAnalytics.schemaIds = [];
                                }
                                documentAnalytics.schemaIds.push(schemaMessage.consensusTimestamp);
                                const schemaDocumentFileString = schemaFileMap.get(schemaMessage.files?.[0]);
                                const schemaDocumentFile = this.parseFile(schemaDocumentFileString);
                                if (schemaDocumentFile?.title) {
                                    documentAnalytics.textSearch += `|${schemaDocumentFile.title}`;
                                    if (!documentAnalytics.schemaNames) {
                                        documentAnalytics.schemaNames = [];
                                    }
                                    documentAnalytics.schemaNames.push(schemaDocumentFile.title);
                                }
                            }
                        }
                    }
                }
            }
            documentAnalytics.issuer = this.getIssuer(documentFile);
        }
        documentAnalytics.labels = labelDocumentMap.get(document.consensusTimestamp);

        return documentAnalytics;
    }

    private async createPolicyAnalytics(
        policyRow: Message,
        topicMap: Map<string, Message[]>,
        srMap: Map<string, Message>,
        documentMap: Map<string, { vc: number, vp: number, evc: number }>,
        tokenMap: Map<string, TokenCache>,
        fileMap: Map<string, Buffer>,
    ): Promise<any> {
        const analytics: PolicyAnalytics = {
            owner: undefined,
            textSearch: textSearch(policyRow),
            tools: [],
            tokens: [],
            registryId: undefined,
            vcCount: 0,
            vpCount: 0,
            tokensCount: 0,
            tags: [],
            hash: null,
            hashMap: null
        };
        await this.findZip(policyRow, fileMap, analytics);
        this.findSR(policyRow, topicMap, srMap, analytics);
        this.findDocuments(policyRow, topicMap, documentMap, analytics);
        this.findNFTs(policyRow, tokenMap, analytics);
        this.findTags(policyRow, analytics);
        return analytics;
    }
    //#endregion

    //#region HELPERS
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

    private getVcs(documentFile: any): any[] | null {
        if (documentFile && documentFile.verifiableCredential) {
            return Array.isArray(documentFile.verifiableCredential)
                ? documentFile.verifiableCredential
                : [documentFile.verifiableCredential];;
        }
        return null;
    }

    private getIssuer(documentFile: any) {
        if (documentFile && documentFile.proof && typeof documentFile.proof.verificationMethod === 'string') {
            return documentFile.proof.verificationMethod.split('#')[0];
        }
        return null;
    }

    private async findZip(
        policyRow: any,
        fileMap: Map<string, Buffer>,
        analytics: PolicyAnalytics
    ): Promise<void> {
        const policyFileId = policyRow.files[0];
        const policyFileBuffer = fileMap.get(policyFileId);
        if (!policyFileBuffer) {
            return;
        }
        const policyData = await parsePolicyFile(policyFileBuffer, false);
        if (!policyData) {
            return;
        }
        analytics.tools = policyData.tools?.map((tool: any) => tool.messageId) || [];
        for (const tool of analytics.tools) {
            analytics.textSearch += `|${tool}`;
        }
        analytics.tokens = policyData.tokens?.map((token: any) => token.tokenId) || [];

        const compareModel = await PolicyLoader.create(policyData, HashComparator.options);
        const { hash, hashMap } = await HashComparator.createHashMap(compareModel);
        analytics.hash = hash;
        analytics.hashMap = hashMap;
    }

    private findSR(
        policyRow: any,
        topicMap: Map<string, Message[]>,
        srMap: Map<string, Message>,
        analytics: PolicyAnalytics
    ): void {
        const topicDescription = topicMap.get(policyRow.topicId)?.[0];
        if (!topicDescription) {
            return;
        }

        const parentTopicId = topicDescription.options?.parentId;
        const registry = srMap.get(parentTopicId);
        if (!registry) {
            return;
        }

        analytics.registryId = registry.consensusTimestamp;
        analytics.owner = registry.options?.did;
    }

    private findDocuments(
        policyRow: any,
        topicMap: Map<string, Message[]>,
        documentMap: Map<string, { vc: number, vp: number, evc: number }>,
        analytics: PolicyAnalytics
    ): void {
        const topics = new Set<string>();
        topics.add(policyRow.options?.instanceTopicId);

        const dynamicTopics = topicMap.get(policyRow.options?.instanceTopicId);
        if (dynamicTopics) {
            for (const dynamicTopic of dynamicTopics) {
                if (dynamicTopic.options?.messageType === 'DYNAMIC_TOPIC') {
                    topics.add(dynamicTopic.options?.childId)
                }
            }
        }

        analytics.vcCount = 0;
        analytics.vpCount = 0;
        for (const topicId of topics) {
            const documents = documentMap.get(topicId);
            if (documents) {
                analytics.vcCount = analytics.vcCount + documents.vc + documents.evc;
                analytics.vpCount = analytics.vpCount + documents.vp;
            }
        }

        analytics.dynamicTopics = Array.from(topics);
    }

    private findNFTs(
        policyRow: any,
        tokenMap: Map<string, TokenCache>,
        analytics: PolicyAnalytics
    ): void {
        if (!analytics.tokens || !analytics.tokens.length) {
            analytics.tokensCount = 0;
            return;
        }
        analytics.tokensCount = 0;
        for (const tokenId of analytics.tokens) {
            const token = tokenMap.get(tokenId);
            if (token) {
                if (token.type === TokenType.NFT) {
                    analytics.tokensCount += Number(token.serialNumber);
                } else {
                    analytics.tokensCount += Number(token.totalSupply);
                }
            }
        }
    }

    private findTags(policyRow: any, analytics: PolicyAnalytics): void {
        analytics.tags = [];
    }
    //#endregion

    private async unpackingSchemas(
        em: MongoEntityManager<MongoDriver>,
        collection: Collection<Message>,
        policyTopicIds: Set<string>
    ) {
        const schemasPackages = collection.find({
            type: MessageType.SCHEMA_PACKAGE,
            topicId: { $in: Array.from(policyTopicIds) },
            loaded: true,
            analytics: { $exists: false }
        });
        const allPackages: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        while (await schemasPackages.hasNext()) {
            const item = await schemasPackages.next();
            allPackages.push(item);
            fileIds.add(item.files?.[0]);
            fileIds.add(item.files?.[2]);
        }

        const fileMap = await fastLoadFiles(fileIds);

        const allSchemas: Message[] = [];
        for (const item of allPackages) {
            const row = em.getReference(Message, item._id);
            await SchemaFileHelper.unpack(em, item, allSchemas, fileMap);
            row.analytics = {
                textSearch: textSearch(row),
                unpacked: true
            };
            em.persist(row);
        }
        return allSchemas;
    }
}
