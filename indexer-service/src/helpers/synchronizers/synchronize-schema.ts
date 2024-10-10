import { DataBaseHelper, Message } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import {
    SchemaField,
    MessageType,
    MessageAction,
    Schema,
} from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';

function parseSchemaFields(
    schemaFields: SchemaField[],
    schemaFieldNames: Set<string>,
    schemaProperties: Set<string>,
    childSchemaIds?: Set<string>
): [Set<string>, Set<string>, Set<string>] {
    for (const field of schemaFields) {
        schemaFieldNames.add(field.name);
        if (field.property) {
            schemaProperties.add(field.property);
        }
        if (field.isRef) {
            childSchemaIds?.add(field.type);
            //parseSchemaFields(field.fields, schemaFieldNames, schemaProperties);
        }
    }
    return [schemaFieldNames, schemaProperties, childSchemaIds];
}

function filter() {
    return {
        // $or: [
        //     {
        //         'analytics.properties': null,
        //     },
        //     {
        //         'analytics.childSchemas': null,
        //     },
        // ],
    };
}

export async function sychronizeSchemas() {
    const em = DataBaseHelper.getEntityManager();
    const collection = em.getCollection('message');
    const schemas = await collection.find({
        type: MessageType.SCHEMA,
        action: {
            $in: [
                MessageAction.PublishSchema,
                MessageAction.PublishSystemSchema,
            ],
        },
        ...filter(),
    });
    let index = 0;
    const count = await schemas.count();
    while (await schemas.hasNext()) {
        index++;
        console.log(`Sync schemas: ${index}/${count}`);
        const schema = await schemas.next();
        const analytics: any = {
            textSearch: textSearch(schema),
        };
        const policies = await em.find(Message, {
            type: MessageType.INSTANCE_POLICY,
            topicId: schema.topicId,
        } as any);
        analytics.policyIds = policies.map(
            (policy) => policy.consensusTimestamp
        );
        for (const policyId of analytics.policyIds) {
            analytics.textSearch += `|${policyId}`;
        }
        if (Array.isArray(schema.files) && schema.files.length > 0) {
            await safetyRunning(async () => {
                const schemaFileId = schema.files[0];
                const schemaFileString = await DataBaseHelper.loadFile(
                    schemaFileId
                );
                const schemaFile = JSON.parse(schemaFileString);
                const parsedSchema = new Schema(schemaFile, '');
                const [schemaFields, schemaProperties, childSchemaIds] =
                    parseSchemaFields(
                        parsedSchema.fields,
                        new Set(),
                        new Set(),
                        new Set()
                    );
                if (schemaFields.size > 0) {
                    analytics.textSearch += `|${[...schemaFields].join('|')}`;
                }
                const childSchemas = await em.find(Message, {
                    topicId: schema.topicId,
                    type: MessageType.SCHEMA,
                    action: {
                        $in: [
                            MessageAction.PublishSchema,
                            MessageAction.PublishSystemSchema,
                        ],
                    },
                    'options.uuid': [...childSchemaIds].map(
                        (item) => item.substring(1).split('&')[0]
                    ),
                } as any);
                analytics.childSchemas = childSchemas.map((item) => ({
                    id: item.consensusTimestamp,
                    name: item.options.name,
                }));
                analytics.properties = [...schemaProperties];
                if (analytics.properties.length > 0) {
                    analytics.textSearch += `|${analytics.properties.join(
                        '|'
                    )}`;
                }
            });
        }
        await collection.updateOne(
            {
                _id: schema._id,
            },
            {
                $set: {
                    analytics,
                },
            },
            {
                upsert: false,
            }
        );
    }
}
