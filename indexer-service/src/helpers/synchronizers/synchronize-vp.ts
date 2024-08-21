import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, IPFS_CID_PATTERN } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';

export class SynchronizationVPs extends SynchronizationTask {
    public readonly name: string = 'vps';

    constructor(mask: string) {
        super('vps', mask);
    }

    protected override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync VPs: load policies`)
        const policyMap = new Map<string, Message>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }

        console.log(`Sync VPs: load topics`)
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

        console.log(`Sync VPs: load documents`)
        const documents = collection.find({
            type: { $in: [MessageType.VP_DOCUMENT] },
            ...this.filter(),
        });
        const allDocuments: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        while (await documents.hasNext()) {
            const document = await documents.next();
            allDocuments.push(document);
            fileIds.add(document.files?.[0]);
        }

        console.log(`Sync VPs: load schemas`)
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

        console.log(`Sync VPs: load files`)
        const fileMap = await loadFiles(fileIds, false);

        console.log(`Sync VPs: update data`)
        for (const document of allDocuments) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document, policyMap, topicMap, schemaMap, fileMap);
            em.persist(row);
        }
        console.log(`Sync VPs: flush`)
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
            const vcs = this.getVcs(documentFile);
            if (!vcs) {
                return documentAnalytics;
            }
            for (const vc of vcs) {
                const subject = this.getSubject(vc);
                if (!subject) {
                    return documentAnalytics;
                }
                const documentFields = new Set<string>();
                this.parseDocumentFields(subject, documentFields);
                if (documentFields.size > 0) {
                    documentAnalytics.textSearch += `|${[...documentFields].join('|')}`;
                }
                const schemaContextCID = this.getContext(vc);
                if (schemaContextCID) {
                    const schemaMessage = schemaMap.get(schemaContextCID);
                    if (schemaMessage) {
                        if (!documentAnalytics.schemaIds) {
                            documentAnalytics.schemaIds = [];
                        }
                        documentAnalytics.schemaIds.push(schemaMessage.consensusTimestamp);
                        const schemaDocumentFileString = fileMap.get(schemaMessage.files?.[0]);
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

    private getVcs(documentFile: any): any[] | null {
        if (documentFile && documentFile.verifiableCredential) {
            return Array.isArray(documentFile.verifiableCredential)
                ? documentFile.verifiableCredential
                : [documentFile.verifiableCredential];;
        }
        return null;
    }

    private getSubject(documentFile: any): any {
        if (documentFile && documentFile.credentialSubject) {
            return documentFile.credentialSubject[0] || documentFile.credentialSubject
        }
        return null;
    }

    private parseDocumentFields(
        document: any,
        fieldValues: Set<string>
    ): void {
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
                    'analytics.schemaNames': null,
                },
                {
                    'analytics.schemaIds': null,
                },
                {
                    'analytics.policyId': null,
                },
            ],
        };
    }
}