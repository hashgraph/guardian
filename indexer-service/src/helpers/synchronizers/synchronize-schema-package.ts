import { DataBaseHelper, Message } from '@indexer/common';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';
import { SchemaField, MessageType, MessageAction, Schema } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';

export class SynchronizationSchemaPackage extends SynchronizationTask {
    public readonly name: string = 'schema-package';

    constructor(mask: string) {
        super('schema-package', mask);
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync schemas package: load policies`)
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

        console.log(`Sync schemas package: load schemas`)
        const packages = collection.find({
            type: MessageType.SCHEMA_PACKAGE,
            loaded: true,
            action: {
                $in: [
                    MessageAction.PublishSchemas,
                    MessageAction.PublishSystemSchemas,
                ],
            },
            analytics: { $exists: false }
        });

        const fileIds: Set<string> = new Set<string>();
        const allPackages: Message[] = [];
        while (await packages.hasNext()) {
            const item = await packages.next();
            allPackages.push(item);
            fileIds.add(item.files?.[0]);
            fileIds.add(item.files?.[2]);
        }

        console.log(`Sync schemas package: load files`)
        const fileMap = await loadFiles(fileIds, false);

        console.log(`Sync schemas package: unpack data`)
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

        console.log(`Sync schemas package: update data`)
        const schemaMap = new Map<string, Message[]>();
        for (const schema of allSchemas) {
            const id = `${schema.topicId}|${schema.options?.uuid}`;
            if (schemaMap.has(id)) {
                schemaMap.get(id).push(schema);
            } else {
                schemaMap.set(id, [schema]);
            }
        }
        for (const schema of allSchemas) {
            schema.analytics = this.createAnalytics(schema, policyMap, schemaMap, fileMap);
            em.persist(schema);
        }

        console.log(`Sync schemas: flush`)
        await em.flush();
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
            }
        }
    }
}