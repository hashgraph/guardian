import { DataBaseHelper, Message } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import {
    MessageType,
    MessageAction,
    IPFS_CID_PATTERN,
} from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';

export class SynchronizationVCs extends SynchronizationTask {
    public readonly name: string = 'vcs';

    constructor(mask: string) {
        super('vcs', mask);
    }

    protected override async sync(): Promise<void> {
        console.log('--- syncVCs ---');
        console.time('--- syncVCs 1 ---');
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
            if (schema.files) {
                if (schema.files[0]) {
                    fileIds.add(schema.files[0]);
                }
                if (schema.files[0]) {
                    schemaMap.set(schema.files[0], schema);
                }
                if (schema.files[1]) {
                    schemaMap.set(schema.files[1], schema);
                }
            }
        }

        console.log(`Sync VCs: load files`)
        // const fileMap = new Map<string, string>();
        // const files = DataBaseHelper.gridFS.find();
        // while (await files.hasNext()) {
        //     const file = await files.next();
        //     if (fileIds.has(file.filename) && !fileMap.has(file.filename)) {
        //         await safetyRunning(async () => {
        //             const fileStream = DataBaseHelper.gridFS.openDownloadStream(file._id);
        //             const bufferArray = [];
        //             for await (const data of fileStream) {
        //                 bufferArray.push(data);
        //             }
        //             const buffer = Buffer.concat(bufferArray);
        //             fileMap.set(file.filename, buffer.toString());
        //         });
        //     }
        // }
        const fileMap = await loadFiles(fileIds);

        console.log(`Sync VCs: update data`);
        for (const document of allDocuments) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document, policyMap, topicMap, schemaMap, fileMap);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncVCs 1 ---');
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

            const schemaContextCID = this.getContext(documentFile);
            if (schemaContextCID) {
                const schemaMessage = schemaMap.get(schemaContextCID);
                if (schemaMessage) {
                    documentAnalytics.schemaId = schemaMessage.consensusTimestamp;
                    const schemaDocumentFileString = fileMap.get(schemaMessage.files?.[0]);
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

    private filter() {
        return {
            $or: [
                {
                    'analytics.schemaName': null,
                },
                {
                    'analytics.schemaId': null,
                },
                {
                    'analytics.policyId': null,
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
}