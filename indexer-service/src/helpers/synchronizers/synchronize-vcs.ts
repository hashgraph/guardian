import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { fastLoadFiles } from '../load-files.js';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';
import { TableFieldHelper } from '../../helpers/table-field-helper.js';
import { BatchLoadHelper } from '../batch-load-helper.js';
import { PrepareRecordHelper } from '../prepare-record-helper.js';

export class SynchronizationVCs extends SynchronizationTask {
    public readonly name: string = 'vcs';

    constructor(mask: string) {
        super('vcs', mask);
    }

    public override async sync(): Promise<void> {

        await PrepareRecordHelper.prepareVCMessages();

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
            parsedContextId: { $exists: true },//Process only prepared records
            ...this.filter(),
        }, {
            sort: { analyticsUpdate: 1 },
            limit: 100000
        });

        console.log(`Sync VCs: load schemas map`);
        const schemaMap = new Map<string, Message>();
        const schemas = collection.find({ type: MessageType.SCHEMA, files: { $exists: true, $not: { $size: 0 } } });
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            if (schema.files && schema.files[0]) {
                schemaMap.set(schema.files[0], schema);
            }
            if (schema.files && schema.files[1]) {
                schemaMap.set(schema.files[1], schema);
            }
        }
        await em.flush();
        await em.clear();

        const tableHelper = new TableFieldHelper();

        await BatchLoadHelper.load<Message>(documents, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Sync VCs: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`)

            const allDocuments: Message[] = [];
            const fileIds: Set<string> = new Set<string>();
            for (const document of rows) {
                allDocuments.push(document);
                fileIds.add(document.files?.[0]);
            }

            //Get only related schemas files
            const schemaFileIds: Set<string> = new Set<string>();
            const relatedSchemasIds = rows.map(r => r.parsedContextId?.context);
            for (const schemaContextCID of relatedSchemasIds) {
                const schemaMessage = schemaMap.get(schemaContextCID);
                if (schemaMessage) {
                    schemaFileIds.add(schemaMessage.files?.[0])
                }
            }

            console.log(`Sync VCs: load vc files`, fileIds.size)
            const fileMap = await fastLoadFiles(fileIds);

            console.log('Sync VCs: load schemas files', schemaFileIds.size);
            const schemaFileMap = await fastLoadFiles(schemaFileIds);
            schemaFileMap.forEach((value, key) => fileMap.set(key, value));

            //Analitics use document.files.[0] + files[] from documents

            console.log(`Sync VCs: update data`);
            for (const document of allDocuments) {
                try {
                    const row = em.getReference(Message, document._id);
                    row.analytics = this.createAnalytics(document, policyMap, topicMap, schemaMap, fileMap);
                    
                    await tableHelper.attachTableFilesAnalytics(row, document, fileMap);

                    row.analyticsUpdate = Date.now();
                    em.persist(row);
                } catch (e) {
                    console.error(`Sync VCs: ${document._id}: error ${e.message}`)
                }
            }

            console.log(`Sync VCs: flush batch`)
            await em.flush();
            await em.clear();
        });

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
                {
                    'analytics.tableFiles': { $exists: false }
                },
                {
                    'analytics.tableFiles': null
                }
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
