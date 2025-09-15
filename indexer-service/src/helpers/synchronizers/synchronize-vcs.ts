import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, IPFS_CID_PATTERN } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';
import { IPFSService } from '../../helpers/ipfs-service.js';

export class SynchronizationVCs extends SynchronizationTask {
    public readonly name: string = 'vcs';

    constructor(mask: string) {
        super('vcs', mask);
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync VCs: load policies`)
        const policyMap = new Map<string, Message>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }

        console.log(`Sync VCs: load topics`)
        const topicMap = new Map<string, Message>();
        const topics = collection.find({
            type: MessageType.TOPIC,
            action: MessageAction.CreateTopic
        });
        while (await topics.hasNext()) {
            const topic = await topics.next();
            if (!topic.options?.childId) {
                topicMap.set(topic.topicId, topic);
            }
        }

        console.log(`Sync VCs: load documents`)
        const documents = collection.find({
            type: { $in: [MessageType.VC_DOCUMENT] },
            ...this.filter(),
        }, {
            sort: { analyticsUpdate: 1 },
            limit: 100000
        });
        const allDocuments: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        while (await documents.hasNext()) {
            const document = await documents.next();
            allDocuments.push(document);
            fileIds.add(document.files?.[0]);
        }

        console.log(`Sync VCs: load schemas`)
        const schemaMap = new Map<string, Message>();
        const schemas = collection.find({ type: MessageType.SCHEMA });
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const documentCID = SchemaFileHelper.getDocumentFile(schema);
            if (documentCID) {
                fileIds.add(documentCID);
            }
            if (schema.files && schema.files[0]) {
                schemaMap.set(schema.files[0], schema);
            }
            if (schema.files && schema.files[1]) {
                schemaMap.set(schema.files[1], schema);
            }
        }

        console.log(`Sync VCs: load files`)
        const fileMap = await loadFiles(fileIds, false);

        console.log(`Sync VCs: update data`);
        for (const document of allDocuments) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document, policyMap, topicMap, schemaMap, fileMap);

            await this.attachTableFilesAnalytics(row, document, fileMap);

            row.analyticsUpdate = Date.now();
            em.persist(row);
        }
        console.log(`Sync VCs: flush`)
        await em.flush();
    }

    private createAnalytics(
        document: Message,
        policyMap: Map<string, Message>,
        topicMap: Map<string, Message>,
        schemaMap: Map<string, Message>,
        fileMap: Map<string, string>
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
                    const schemaDocumentCID = SchemaFileHelper.getDocumentFile(schemaMessage);
                    const schemaDocumentFileString = fileMap.get(schemaDocumentCID);
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

    private filter() {
        return {
            $or: [
                {
                    'analytics.schemaName': null,
                },
                {
                    'analytics.schemaId': null,
                },
            ],
        };
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

    /**
     * Attach table-files mapping to VC analytics.
     *
     * @param row        DB entity reference to be persisted (Message)
     * @param document   Original VC message document
     * @param fileMap    Map<filename, fileContent> from preloaded GridFS read
     */
    private async attachTableFilesAnalytics(
        row: Message,
        document: Message,
        fileMap: Map<string, string>,
    ): Promise<void> {
        try {
            const tableFilesMap = await this.computeTableFilesMap(document, fileMap);

            if (!tableFilesMap || Object.keys(tableFilesMap).length === 0) {
                return;
            }

            row.analytics = row.analytics || {};
            row.analytics.tableFiles = tableFilesMap;
        } catch (error) {
            //
        }
    }

    /**
     * Build a map { cid: gridfsId } for all table-like assets referenced by the VC.
     *
     * @param document   Original VC message
     * @param fileMap    Map<filename, fileContent> from preloaded GridFS read
     * @returns          Record<string, string> where key = CID, value = GridFS _id
     */
    private async computeTableFilesMap(
        document: Message,
        fileMap: Map<string, string>,
    ): Promise<Record<string, string>> {
        const vcCid = Array.isArray(document.files) ? document.files[0] : null;
        if (!vcCid) {
            return {};
        }

        const vcString = fileMap.get(vcCid);
        if (!vcString) {
            return {};
        }

        const vcJson = this.parseFile(vcString);
        const subject = this.getSubject(vcJson);
        if (!subject) {
            return {};
        }

        const tableCids = this.extractTableCidsFromSubject(subject);
        if (tableCids.size === 0) {
            return {};
        }

        const cidToGridFsId: Record<string, string> = {};
        for (const cid of tableCids) {
            const gridFsId = await this.ensureFileCachedInGridFS(cid);
            if (gridFsId) {
                cidToGridFsId[cid] = gridFsId;
            }
        }

        return cidToGridFsId;
    }

    /**
     * Recursively extract table-related CIDs from credentialSubject.
     *
     * @param node  Any JSON node
     * @returns     Set of unique CIDs found
     */
    private extractTableCidsFromSubject(node: unknown): Set<string> {
        const foundCids = new Set<string>();

        const isCid = (value: unknown): value is string => {
            return typeof value === 'string' && IPFS_CID_PATTERN.test(value);
        };

        const walk = (value: unknown) => {
            if (Array.isArray(value)) {
                for (const item of value) {
                    walk(item);
                }
                return;
            }

            if (value && typeof value === 'object') {
                const obj = value as Record<string, unknown>;

                if (typeof obj.type === 'string' && obj.type.toLowerCase() === 'table' && isCid(obj.cid)) {
                    foundCids.add(obj.cid);
                }

                for (const val of Object.values(obj)) {
                    if (val && typeof val === 'object') {
                        walk(val);
                    }
                }
            }
        };

        walk(node);
        return foundCids;
    }

    /**
     * Ensure file with given CID is cached in our GridFS (filename = CID).
     * If missing, downloads bytes from IPFS and uploads to GridFS.
     *
     * @param cid        IPFS CID string
     * @param timeoutMs  IPFS gateway timeout (ms)
     * @returns          GridFS file _id as string or null if failed
     */
    private async ensureFileCachedInGridFS(
        cid: string,
        timeoutMs: number = 60_000,
    ): Promise<string | null> {
        try {
            const existingFiles = await DataBaseHelper.gridFS.find({ filename: cid }).toArray();

            if (existingFiles && existingFiles.length > 0) {
                return existingFiles[0]._id.toString();
            }

            const fileContent = await IPFSService.getFile(cid, timeoutMs);
            if (!fileContent) {
                return null;
            }

            return await new Promise<string>((resolve, reject) => {
                try {
                    const uploadStream = DataBaseHelper.gridFS.openUploadStream(cid);
                    uploadStream.write(fileContent as Buffer);
                    uploadStream.end(() => {
                        resolve(String(uploadStream.id));
                    });
                } catch (error) {
                    reject(error);
                }
            });
        } catch {
            return null;
        }
    }
}
