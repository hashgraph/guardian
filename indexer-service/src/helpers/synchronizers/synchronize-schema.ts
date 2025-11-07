import { DataBaseHelper, Message } from '@indexer/common';
import { SchemaField, MessageType, MessageAction, Schema } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { fastLoadFiles } from '../load-files.js';
import { BatchLoadHelper } from '../batch-load-helper.js';

export class SynchronizationSchemas extends SynchronizationTask {
    public readonly name: string = 'schemas';

    constructor(mask: string) {
        super('schemas', mask);
    }

    public override async sync(): Promise<void> {
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
                ]
            },
            loaded: true, //Not process record without loaded files
            processedSchemas: { $ne: true }, //Not process record twice
        });

        await BatchLoadHelper.load<Message>(schemas, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Sync schemas: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`);

            const fileIds: Set<string> = new Set<string>();
            const allSchemas: Message[] = [];
            for (const schema of rows) {
                const id = `${schema.topicId}|${schema.options?.uuid}`;
                if (schemaMap.has(id)) {
                    schemaMap.get(id).push(schema);
                } else {
                    schemaMap.set(id, [schema]);
                }
                allSchemas.push(schema);
                fileIds.add(schema.files?.[0]);
            }

            console.log(`Sync schemas: load files`, fileIds.size);
            const fileMap = await fastLoadFiles(fileIds);


            console.log(`Sync schemas: update data`, allSchemas.length);
            for (const schema of allSchemas) {
                const row = em.getReference(Message, schema._id);
                row.analytics = this.createAnalytics(schema, policyMap, schemaMap, fileMap);
                row.processedSchemas = true; //Mark record as processed
                em.persist(row);

            }
            console.log(`Sync schemas: flush batch.`)
            await em.flush();
            await em.clear();
        });
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
            for (const item of childSchemaIds) {
                const uuid = item.substring(1).split('&')[0];
                const id = `${schema.topicId}|${uuid}`;
                const ids = schemaMap.get(id);
                if (ids && ids.length) {
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
