import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, IPFS_CID_PATTERN, VPAnalytics } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';
import { Collection } from 'mongodb';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';

export class SynchronizationVPs extends SynchronizationTask {
    public readonly name: string = 'vps';

    constructor(mask: string) {
        super('vps', mask);
    }

    private async loadPolicies(collection: Collection<Message>) {
        console.log(`Sync VPs: load policies`)
        const policyMap = new Map<string, Message>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }
        return policyMap;
    }

    private async loadTopics(collection: Collection<Message>) {
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
        return topicMap;
    }

    private async loadSchemas(collection: Collection<Message>, fileIds: Set<string>) {
        console.log(`Sync VPs: load schemas`)
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
        return schemaMap;
    }

    private async loadLabelDocuments(collection: Collection<Message>) {
        console.log(`Sync VPs: load label documents`)
        const labels = collection.find({
            action: MessageAction.CreateLabelDocument
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

    private async loadDocuments(collection: Collection<Message>, fileIds: Set<string>) {
        console.log(`Sync VPs: load documents`)
        const documents = collection.find({
            type: { $in: [MessageType.VP_DOCUMENT] },
            ...this.filter(),
        }, {
            sort: { analyticsUpdate: 1 },
            limit: 100000
        });
        const allDocuments: Message[] = [];
        while (await documents.hasNext()) {
            const document = await documents.next();
            allDocuments.push(document);
            fileIds.add(document.files?.[0]);
        }
        return allDocuments;
    }

    private async loadFiles(fileIds: Set<string>) {
        console.log(`Sync VPs: load files`)
        const fileMap = await loadFiles(fileIds, false);
        return fileMap;
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        const fileIds: Set<string> = new Set<string>();
        const policyMap = await this.loadPolicies(collection);
        const topicMap = await this.loadTopics(collection);
        const schemaMap = await this.loadSchemas(collection, fileIds);
        const labelDocumentMap = await this.loadLabelDocuments(collection);
        const needUpdate = await this.loadDocuments(collection, fileIds);
        const fileMap = await this.loadFiles(fileIds);

        console.log(`Sync VPs: update data`)
        for (const document of needUpdate) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(
                document,
                policyMap,
                topicMap,
                schemaMap,
                fileMap,
                labelDocumentMap
            );
            row.analyticsUpdate = Date.now();
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
        fileMap: Map<string, string>,
        labelDocumentMap: Map<string, string[]>
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
                                const schemaDocumentCID = SchemaFileHelper.getDocumentFile(schemaMessage);
                                const schemaDocumentFileString = fileMap.get(schemaDocumentCID);
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

    private getIssuer(documentFile: any) {
        if (documentFile && documentFile.proof && typeof documentFile.proof.verificationMethod === 'string') {
            return documentFile.proof.verificationMethod.split('#')[0];
        }
        return null;
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