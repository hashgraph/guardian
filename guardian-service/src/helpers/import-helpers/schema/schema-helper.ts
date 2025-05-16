import { GenerateUUIDv4, IOwner, IRootConfig, ISchema, ModelHelper, ModuleStatus, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { DatabaseServer, MessageAction, MessageServer, MessageType, PinoLogger, Schema as SchemaCollection, SchemaConverterUtils, SchemaMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { FilterObject } from '@mikro-orm/core';
import { INotifier } from '../../notifier.js';
import { importTag } from '../tag/tag-import-helper.js';
import { checkForCircularDependency, loadSchema } from '../common/load-helper.js';

/**
 * Only unique
 * @param value
 * @param index
 * @param self
 */
export function onlyUnique(value: any, index: any, self: any): boolean {
    return self.indexOf(value) === index;
}

/**
 * Update defs in related schemas
 * @param schemaId Schema id
 */
export async function updateSchemaDefs(schemaId: string, oldSchemaId?: string) {
    if (!schemaId) {
        return;
    }

    const schema = await DatabaseServer.getSchema({ iri: schemaId });
    if (!schema) {
        throw new Error(`Can not find schema ${schemaId}`);
    }

    const schemaDocument = schema.document;
    if (!schemaDocument) {
        return;
    }

    const schemaDefs = schema.document.$defs;
    delete schemaDocument.$defs;

    const filters: any = {};
    filters.defs = { $elemMatch: { $eq: oldSchemaId || schemaId } };
    const relatedSchemas = await DatabaseServer.getSchemas(filters);
    for (const rSchema of relatedSchemas) {
        if (oldSchemaId) {
            let document = JSON.stringify(rSchema.document) as string;
            document = document.replaceAll(oldSchemaId.substring(1), schemaId.substring(1));
            rSchema.document = JSON.parse(document);
        }
        rSchema.document.$defs[schemaId] = schemaDocument;
        if (schemaDefs) {
            for (const def of Object.keys(schemaDefs)) {
                rSchema.document.$defs[def] = schemaDefs[def];
            }
        }
    }
    await DatabaseServer.updateSchemas(relatedSchemas);
}

/**
 * Increment schema version
 * @param iri
 * @param user
 */
export async function incrementSchemaVersion(
    topicId: string,
    iri: string,
    user: IOwner
): Promise<SchemaCollection> {
    if (!user || !iri) {
        throw new Error(`Invalid increment schema version parameter`);
    }

    const filter: any = { iri, owner: user.owner };
    if (topicId) {
        filter.topicId = topicId;
    }
    const schema = await DatabaseServer.getSchema(filter);

    if (!schema) {
        return;
    }

    if (schema.status === SchemaStatus.PUBLISHED) {
        return schema;
    }

    const { previousVersion } = SchemaHelper.getVersion(schema);
    let newVersion = '1.0.0';
    if (previousVersion) {
        const schemas = await DatabaseServer.getSchemas({ uuid: schema.uuid });
        const versions = [];
        for (const element of schemas) {
            const elementVersions = SchemaHelper.getVersion(element);
            versions.push(elementVersions.version, elementVersions.previousVersion);
        }
        newVersion = SchemaHelper.incrementVersion(previousVersion, versions);
    }
    schema.version = newVersion;

    return schema;
}

/**
 * Update schema document
 * @param schema Schema
 */
export async function updateSchemaDocument(schema: SchemaCollection): Promise<void> {
    if (!schema) {
        throw new Error(`There is no schema to update document`);
    }
    const publishedToolsTopics = await DatabaseServer.getTools(
        {
            status: ModuleStatus.PUBLISHED,
        },
        {
            fields: ['topicId'],
        }
    );
    const allSchemasInTopic = await DatabaseServer.getSchemas({
        topicId: {
            $in: [schema.topicId].concat(
                publishedToolsTopics.map((tool) => tool.topicId)
            ),
        },
    });
    const allParsedSchemas = allSchemasInTopic.map(item => new Schema(item));
    const parsedSchema = new Schema(schema, true);
    parsedSchema.update(parsedSchema.fields, parsedSchema.conditions);
    parsedSchema.updateRefs(allParsedSchemas);
    schema.document = parsedSchema.document;
    await DatabaseServer.updateSchema(schema.id, schema);
}

/**
 * Fixing defs in importing schemas
 * @param iri Schema iri
 * @param schemas Schemas
 * @param map Map of updated schemas
 */
export function fixSchemaDefsOnImport(
    iri: string,
    schemas: Schema[],
    map: { [x: string]: Schema }
): boolean {
    if (map[iri]) {
        return true;
    }
    const schema = schemas.find(s => s.iri === iri);
    if (!schema) {
        return false;
    }
    let valid = true;
    for (const field of schema.fields) {
        if (field.isRef) {
            const fieldValid = fixSchemaDefsOnImport(field.type, schemas, map);
            if (!fieldValid) {
                field.type = null;
            }
            valid = valid && fieldValid;
        }
    }
    schema.update(schema.fields, schema.conditions);
    schema.updateRefs(schemas);
    map[iri] = schema;
    return valid;
}

/**
 * Send schema message
 * @param root User
 * @param topic Topic
 * @param action
 * @param schema Schema
 */
export async function sendSchemaMessage(
    owner: IOwner,
    root: IRootConfig,
    topic: TopicConfig,
    action: MessageAction,
    schema: SchemaCollection,
) {
    const messageServer = new MessageServer(
        root.hederaAccountId,
        root.hederaAccountKey,
        root.signOptions
    );
    const message = new SchemaMessage(action);
    message.setDocument(schema);
    await messageServer
        .setTopicObject(topic)
        .sendMessage(message, true, null, owner.id);
}

export async function copyDefsSchemas(
    defs: any,
    user: IOwner,
    topicId: string,
    root: any
) {
    if (!defs) {
        return;
    }
    const schemasIdsInDocument = Object.keys(defs);
    for (const schemaId of schemasIdsInDocument) {
        await copySchemaAsync(schemaId, topicId, null, user);
    }
}

export async function copySchemaAsync(
    iri: string,
    topicId: string,
    name: string,
    user: IOwner
) {
    const users = new Users();
    const root = await users.getHederaAccount(user.creator, user.id);

    let item = await DatabaseServer.getSchema({ iri });

    const oldSchemaIri = item.iri;
    await copyDefsSchemas(item.document?.$defs, user, topicId, root);
    item = await DatabaseServer.getSchema({ iri });

    let contextURL = null;
    if (item.contextURL && item.contextURL.startsWith('schema:')) {
        contextURL = item.contextURL;
    }

    // Clean document
    delete item._id;
    delete item.id;
    delete item.documentURL;
    delete item.documentFileId;
    delete item.contextURL;
    delete item.contextFileId;
    delete item.messageId;
    delete item.createDate;
    delete item.updateDate;

    if (name) {
        item.name = name;
    }
    item.uuid = GenerateUUIDv4();
    item.contextURL = contextURL;
    item.status = SchemaStatus.DRAFT;
    item.topicId = topicId;

    SchemaHelper.setVersion(item, null, null);
    SchemaHelper.updateIRI(item);
    item.iri = item.iri || item.uuid;

    await DatabaseServer.saveSchema(item)

    await updateSchemaDocument(item);
    await updateSchemaDefs(item.iri, oldSchemaIri);

    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, user.id);

    if (topic) {
        await sendSchemaMessage(
            user,
            root,
            topic,
            MessageAction.CreateSchema,
            item
        );
    }
    return item;
}

/**
 * Check parent schema and create new with tags
 * @param category
 * @param newSchema
 * @param user
 * @param notifier
 */
export async function createSchemaAndArtifacts(
    category: SchemaCategory,
    newSchema: ISchema,
    user: IOwner,
    notifier: INotifier
) {
    let old: SchemaCollection;
    let previousVersion = '';
    if (newSchema.id) {
        old = await DatabaseServer.getSchemaById(newSchema.id);
        if (!old) {
            throw new Error('Schema does not exist.');
        }
        if (old.owner !== user.owner) {
            throw new Error('Invalid creator.');
        }
        previousVersion = old.version;
    }

    delete newSchema._id;
    delete newSchema.id;
    delete newSchema.status;
    newSchema.category = category || SchemaCategory.POLICY;
    newSchema.readonly = false;
    newSchema.system = false;
    if (newSchema.uuid) {
        newSchema.contextURL = `schema:${newSchema.uuid}`;
    }

    SchemaHelper.setVersion(newSchema, null, previousVersion);
    const row = await createSchema(newSchema, user, notifier);

    if (old) {
        const tags = await DatabaseServer.getTags({
            localTarget: old.id
        });
        await importTag(tags, row.id.toString());
    }

    return row;
}

/**
 * Create schema
 * @param newSchema
 * @param user
 * @param notifier
 */
export async function createSchema(
    newSchema: ISchema,
    user: IOwner,
    notifier: INotifier
): Promise<SchemaCollection> {
    if (checkForCircularDependency(newSchema)) {
        throw new Error(`There is circular dependency in schema: ${newSchema.iri}`);
    }

    delete newSchema.id;
    delete newSchema._id;
    const users = new Users();
    notifier.start('Resolve Hedera account');
    const root = await users.getHederaAccount(user.creator, user.id);

    notifier.completedAndStart('Save in DB');
    if (newSchema) {
        delete newSchema.status;
    }

    const schemaObject = DatabaseServer.createSchema(newSchema);
    notifier.completedAndStart('Resolve Topic');
    let topic: TopicConfig;
    if (newSchema.topicId) {
        topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(newSchema.topicId), true, user.id);
    }

    if (!topic && newSchema.topicId !== 'draft') {
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
        topic = await topicHelper.create({
            type: TopicType.SchemaTopic,
            name: TopicType.SchemaTopic,
            description: TopicType.SchemaTopic,
            owner: user.creator,
            policyId: null,
            policyUUID: null
        }, user.id);
        await topic.saveKeys(user.id);
        await DatabaseServer.saveTopic(topic.toObject());
        await topicHelper.twoWayLink(topic, null, null, user.id);
    }

    const errors = SchemaHelper.checkErrors(newSchema as Schema)
    SchemaHelper.updateIRI(schemaObject);
    schemaObject.errors = errors;
    schemaObject.status = errors?.length ? SchemaStatus.ERROR : SchemaStatus.DRAFT;
    schemaObject.topicId = topic?.topicId || 'draft';
    schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;
    schemaObject.codeVersion = SchemaConverterUtils.VERSION;
    const errorsCount = await DatabaseServer.getSchemasCount({
        iri: {
            $eq: schemaObject.iri,
        },
        $or: [
            {
                topicId: {
                    $ne: schemaObject.topicId,
                },
            },
            {
                uuid: {
                    $ne: schemaObject.uuid,
                },
            },
        ],
    } as FilterObject<SchemaCollection>,
    );
    if (errorsCount > 0) {
        throw new Error('Schema identifier already exist');
    }
    notifier.completedAndStart('Save to IPFS & Hedera');
    if (topic) {
        await sendSchemaMessage(
            user,
            root,
            topic,
            MessageAction.CreateSchema,
            schemaObject
        );
    }
    notifier.completedAndStart('Update schema in DB');
    const savedSchema = await DatabaseServer.saveSchema(schemaObject);
    notifier.completed();
    return savedSchema;
}

/**
 * Delete schema
 * @param schemaId Schema ID
 * @param owner
 * @param notifier Notifier
 */
export async function deleteSchema(
    schemaId: any,
    owner: IOwner,
    notifier: INotifier,
) {
    if (!schemaId) {
        return;
    }

    const item = await DatabaseServer.getSchema(schemaId);
    if (!item) {
        throw new Error('Schema not found');
    }
    if (item.status !== SchemaStatus.DRAFT && item.status !== SchemaStatus.ERROR) {
        throw new Error('Schema is not in draft status');
    }

    notifier.info(`Delete schema ${item.name}`);
    if (item.topicId) {
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, owner.id);
        if (topic) {
            const users = new Users();
            const root = await users.getHederaAccount(owner.creator, owner.id);
            await sendSchemaMessage(
                owner,
                root,
                topic,
                MessageAction.DeleteSchema,
                item
            );
        }
    }
    await DatabaseServer.deleteSchemas(item.id);
}

/**
 * Delete schema
 * @param schemaId Schema ID
 * @param owner
 * @param notifier Notifier
 */
export async function deleteDemoSchema(
    schemaId: any,
    owner: IOwner,
    notifier: INotifier,
) {
    if (!schemaId) {
        return;
    }

    const item = await DatabaseServer.getSchema(schemaId);
    if (!item) {
        throw new Error('Schema not found');
    }

    notifier.info(`Delete schema ${item.name}`);
    await DatabaseServer.deleteSchemas(item.id);
}

/**
 * Prepare schema for preview
 * @param messageIds
 * @param notifier
 * @param logger
 */
export async function prepareSchemaPreview(
    messageIds: string[],
    notifier: INotifier,
    logger: PinoLogger,
    userId: string | null
): Promise<any[]> {
    notifier.start('Load schema file');
    const schemas = [];
    for (const messageId of messageIds) {
        const schema = await loadSchema(messageId, logger, userId);
        schemas.push(schema);
    }

    notifier.completedAndStart('Parse schema');
    const messageServer = new MessageServer(null, null);
    const uniqueTopics = schemas.map(res => res.topicId).filter(onlyUnique);
    const anotherSchemas: SchemaMessage[] = [];
    for (const topicId of uniqueTopics) {
        const anotherVersions = await messageServer.getMessages<SchemaMessage>(
            topicId,
            userId,
            MessageType.Schema,
            MessageAction.PublishSchema
        );
        for (const ver of anotherVersions) {
            anotherSchemas.push(ver);
        }
    }

    notifier.completedAndStart('Verifying');
    for (const schema of schemas) {
        if (!schema.version) {
            continue;
        }
        const newVersions = [];
        const topicMessages = anotherSchemas.filter(item => item.uuid === schema.uuid);
        for (const topicMessage of topicMessages) {
            if (
                topicMessage.version &&
                ModelHelper.versionCompare(topicMessage.version, schema.version) === 1
            ) {
                newVersions.push({
                    messageId: topicMessage.getId(),
                    version: topicMessage.version
                });
            }
        }
        if (newVersions && newVersions.length !== 0) {
            schema.newVersions = newVersions.reverse();
        }
    }
    notifier.completed();
    return schemas;
}
