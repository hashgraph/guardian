import { DataBaseHelper, Message } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import {
    SchemaField,
    MessageType,
    MessageAction,
    Schema,
} from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationSchemas extends SynchronizationTask {
    public readonly name: string = 'schemas';

    constructor(mask: string) {
        super('schemas', mask);
    }

    protected override async sync(): Promise<void> {
        console.time('--- syncSchemas 1 ---');
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync schemas: load policies`)
        const policyMap = new Map<string, Message[]>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policyMap.has(policy.topicId)) {
                policyMap.get(policy.topicId).push(policy);
            } else {
                policyMap.set(policy.topicId, [policy]);
            }
        }

        console.log(`Sync schemas: load schemas`)
        const schemaMap = new Map<string, Message[]>();
        const schemas = collection.find({
            type: MessageType.SCHEMA,
            action: {
                $in: [
                    MessageAction.PublishSchema,
                    MessageAction.PublishSystemSchema,
                ],
            }
        });
        const fileIds: Set<string> = new Set<string>();
        const allSchemas: Message[] = [];
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const id = `${schema.topicId}|${schema.options?.uuid}`;
            if (schemaMap.has(id)) {
                schemaMap.get(id).push(schema);
            } else {
                schemaMap.set(id, [schema]);
            }
            allSchemas.push(schema);
            fileIds.add(schema.files?.[0]);
        }

        console.log(`Sync schemas: load files`)
        const fileMap = new Map<string, string>();
        const files = DataBaseHelper.gridFS.find();
        while (await files.hasNext()) {
            const file = await files.next();
            if (fileIds.has(file.filename) && !fileMap.has(file.filename)) {
                await safetyRunning(async () => {
                    const fileStream = DataBaseHelper.gridFS.openDownloadStream(file._id);
                    const bufferArray = [];
                    for await (const data of fileStream) {
                        bufferArray.push(data);
                    }
                    const buffer = Buffer.concat(bufferArray);
                    fileMap.set(file.filename, buffer.toString());
                });
            }
        }
        console.log(`Sync schemas: update data`)
        for (const schema of allSchemas) {
            const row = em.getReference(Message, schema._id);
            row.analytics = this.createAnalytics(schema, policyMap, schemaMap, fileMap);
            em.persist(row);
        }
        await em.flush();
        console.timeEnd('--- syncSchemas 1 ---');
    }

    private createAnalytics(
        schema: Message,
        policyMap: Map<string, Message[]>,
        schemaMap: Map<string, Message[]>,
        fileMap: Map<string, string>
    ): any {
        const analytics: any = {
            textSearch: textSearch(schema),
        };

        const policies = policyMap.get(schema.topicId) || [];
        analytics.policyIds = policies.map((policy) => policy.consensusTimestamp);

        for (const policyId of analytics.policyIds) {
            analytics.textSearch += `|${policyId}`;
        }

        if (Array.isArray(schema.files) && schema.files.length > 0) {
            const schemaFileId = schema.files[0];
            const schemaFileString = fileMap.get(schemaFileId);
            const schemaFields = new Set<string>();
            const schemaProperties = new Set<string>();
            const childSchemaIds = new Set<string>();
            this.parseSchema(schemaFileString, schemaFields, schemaProperties, childSchemaIds);
            if (schemaFields.size > 0) {
                analytics.textSearch += `|${[...schemaFields].join('|')}`;
            }
            let childSchemas = [];
            for (const uuid of childSchemaIds) {
                const id = `${schema.topicId}|${uuid}`;
                const ids = schemaMap.get(id);
                if (ids) {
                    childSchemas = childSchemas.concat(ids);
                }
            }
            analytics.childSchemas = childSchemas.map((item) => ({
                id: item.consensusTimestamp,
                name: item.options.name,
            }));
            analytics.properties = [...schemaProperties];
            if (analytics.properties.length > 0) {
                analytics.textSearch += `|${analytics.properties.join('|')}`;
            }
        }
        return analytics;
    }

    private parseSchema(
        file: string,
        schemaFieldNames: Set<string>,
        schemaProperties: Set<string>,
        childSchemaIds: Set<string>
    ) {
        try {
            if (file) {
                const schemaFile = JSON.parse(file);
                const parsedSchema = new Schema(schemaFile, '');
                this.parseSchemaFields(parsedSchema.fields, schemaFieldNames, schemaProperties, childSchemaIds);
            }
        } catch (error) {
            return;
        }
    }

    private parseSchemaFields(
        schemaFields: SchemaField[],
        schemaFieldNames: Set<string>,
        schemaProperties: Set<string>,
        childSchemaIds: Set<string>
    ): void {
        for (const field of schemaFields) {
            schemaFieldNames.add(field.name);
            if (field.property) {
                schemaProperties.add(field.property);
            }
            if (field.isRef) {
                childSchemaIds.add(field.type);
                //parseSchemaFields(field.fields, schemaFieldNames, schemaProperties);
            }
        }
    }
}