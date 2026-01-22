import { GenerateUUIDv4, IOwner, IRootConfig, ISchema, ModelHelper, ModuleStatus, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { DatabaseServer, INotificationStep, MessageAction, MessageServer, PinoLogger, Schema as SchemaCollection, SchemaConverterUtils, SchemaMessage, TopicConfig, TopicHelper, Users } from '@guardian/common';
import { FilterObject } from '@mikro-orm/core';
import { importTag } from '../tag/tag-import-helper.js';
import { checkForCircularDependency, loadAnotherSchemas, loadSchema } from '../common/load-helper.js';

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

    const filters: any = {
        defs: oldSchemaId || schemaId
    };
    const relatedSchemas = await DatabaseServer.getSchemas(filters);
    if (!relatedSchemas.length) {
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

    const schemaDefs = schemaDocument.$defs;
    delete schemaDocument.$defs;

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
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    });
    const message = new SchemaMessage(action);
    message.setDocument(schema);
    await messageServer
        .setTopicObject(topic)
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });
}

export async function copyDefsSchemas(
    defs: any,
    user: IOwner,
    topicId: string,
    root: any,
    copyNested: boolean,
    copiedSchemas: Map<string, SchemaCollection>

) {
    if (!defs) {
        return;
    }
    const schemasIdsInDocument = Object.keys(defs);
    for (const schemaId of schemasIdsInDocument) {
        await copySchemaAsync(schemaId, topicId, null, user, copyNested, copiedSchemas);
    }
}

export async function copySchemaAsync(
    iri: string,
    topicId: string,
    name: string,
    user: IOwner,
    copyNested: boolean = true,
    copiedSchemas: Map<string, SchemaCollection> = new Map()
) {
    if (['#SentinelHUB', '#GeoJSON'].includes(iri)) {
        return;
    }

    if (copiedSchemas.has(iri)) {
        return;
    }

    const users = new Users();
    const root = await users.getHederaAccount(user.creator, user.id);

    const item = await DatabaseServer.getSchema({ iri });

    if (copyNested) {
        await copyDefsSchemas(item.document?.$defs, user, topicId, root, copyNested, copiedSchemas);
    }

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

    const newVersion = SchemaHelper.incrementVersion(item.version, []);
    SchemaHelper.setVersion(item, newVersion, null);
    SchemaHelper.updateIRI(item);
    item.iri = item.iri || item.uuid;

    if (item.document?.$defs) {
        const oldDefsIds = Object.keys(item.document?.$defs);
        const newDefs = {};

        for (const oldId of oldDefsIds) {
            const copiedSchema = copiedSchemas.get(oldId);

            if (copiedSchema) {
                newDefs[copiedSchema.iri] = copiedSchema.document;
            } else {
                newDefs[oldId] = item.document.$defs[oldId];
            }
        }
    }

    let document = JSON.stringify(item.document) as string;

    for (const [oldId, newSchema] of copiedSchemas.entries()) {
        document = document.replaceAll(oldId.substring(1), newSchema.iri.substring(1));
    }

    item.document = JSON.parse(document);

    const newItem = await DatabaseServer.saveSchema(item);

    copiedSchemas.set(iri, newItem);

    // const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, user.id);
    // if (topic) {
    //     await sendSchemaMessage(user, root, topic, MessageAction.CreateSchema, item);
    // }
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
    notifier: INotificationStep
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

    const newVersion = SchemaHelper.incrementVersion(newSchema.version, []);
    SchemaHelper.setVersion(newSchema, newVersion, previousVersion);
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
    notifier: INotificationStep
): Promise<SchemaCollection> {
    // <-- Steps
    const STEP_RESOLVE_ACCOUNT = 'Resolve Hedera account';
    const STEP_SAVE = 'Save in DB';
    const STEP_RESOLVE_TOPIC = 'Resolve topic';
    const STEP_SEND = 'Save to IPFS & Hedera';
    const STEP_UPDATE = 'Update schema in DB';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_ACCOUNT);
    notifier.addStep(STEP_SAVE);
    notifier.addStep(STEP_RESOLVE_TOPIC);
    notifier.addStep(STEP_SEND);
    notifier.addStep(STEP_UPDATE);
    notifier.start();

    if (checkForCircularDependency(newSchema)) {
        throw new Error(`There is circular dependency in schema: ${newSchema.iri}`);
    }

    delete newSchema.id;
    delete newSchema._id;
    const users = new Users();
    notifier.startStep(STEP_RESOLVE_ACCOUNT);
    const root = await users.getHederaAccount(user.creator, user.id);
    notifier.completeStep(STEP_RESOLVE_ACCOUNT);

    notifier.startStep(STEP_SAVE);
    if (newSchema) {
        delete newSchema.status;
    }

    const schemaObject = DatabaseServer.createSchema(newSchema);
    notifier.completeStep(STEP_SAVE);

    notifier.startStep(STEP_RESOLVE_TOPIC);
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
    notifier.completeStep(STEP_RESOLVE_TOPIC);

    notifier.startStep(STEP_SEND);
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
    } as FilterObject<SchemaCollection>);
    if (errorsCount > 0) {
        throw new Error('Schema identifier already exist');
    }
    // if (topic) {
    //     await sendSchemaMessage(user, root, topic, MessageAction.CreateSchema, schemaObject);
    // }
    notifier.completeStep(STEP_SEND);

    notifier.startStep(STEP_UPDATE);
    const savedSchema = await DatabaseServer.saveSchema(schemaObject);
    notifier.completeStep(STEP_UPDATE);

    notifier.complete();
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
    notifier: INotificationStep,
) {
    // <-- Steps
    const STEP_DELETE_SCHEMA = 'Delete schema';
    // Steps -->

    notifier.addStep(STEP_DELETE_SCHEMA);
    notifier.start();
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

    // if (item.topicId) {
    //     const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, owner.id);
    //     if (topic) {
    //         const users = new Users();
    //         const root = await users.getHederaAccount(owner.creator, owner.id);
    //         await sendSchemaMessage(owner, root, topic, MessageAction.DeleteSchema, item);
    //     }
    // }
    notifier.startStep(STEP_DELETE_SCHEMA);
    await DatabaseServer.deleteSchemas(item.id);
    notifier.completeStep(STEP_DELETE_SCHEMA);

    notifier.complete();

    return true;
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
    notifier: INotificationStep,
) {
    notifier.start();

    if (!schemaId) {
        return;
    }

    const item = await DatabaseServer.getSchema(schemaId);
    if (!item) {
        throw new Error('Schema not found');
    }

    await DatabaseServer.deleteSchemas(item.id);

    notifier.complete();
}

/**
 * Prepare schema for preview
 * @param messageIds
 * @param notifier
 * @param logger
 */
export async function prepareSchemaPreview(
    messageIds: string[],
    notifier: INotificationStep,
    logger: PinoLogger,
    userId: string | null
): Promise<any[]> {
    // <-- Steps
    const STEP_LOAD_FILE = 'Load schema file';
    const STEP_LOAD_ANOTHER_FILES = 'Load another schemas';
    const STEP_VERIFYING = 'Verifying';
    // Steps -->

    notifier.addStep(STEP_LOAD_FILE);
    notifier.addStep(STEP_LOAD_ANOTHER_FILES);
    notifier.addStep(STEP_VERIFYING);
    notifier.start();

    notifier.startStep(STEP_LOAD_FILE);
    const schemas = [];
    for (const messageId of messageIds) {
        const schema = await loadSchema(messageId, logger, userId);
        if (Array.isArray(schema)) {
            for (const s of schema) {
                schemas.push(s);
            }
        } else if (schema) {
            schemas.push(schema);
        }
    }
    notifier.completeStep(STEP_LOAD_FILE);

    notifier.startStep(STEP_LOAD_ANOTHER_FILES);
    const uniqueTopics = schemas.map(res => res.topicId).filter(onlyUnique);
    const anotherSchemas = await loadAnotherSchemas(uniqueTopics, logger, userId);
    notifier.completeStep(STEP_LOAD_ANOTHER_FILES);

    notifier.startStep(STEP_VERIFYING);
    for (const schema of schemas) {
        if (!schema.version) {
            continue;
        }
        const newVersions = anotherSchemas
            .filter((anotherSchema) => anotherSchema.uuid === schema.uuid)
            .filter((anotherSchema) => (
                anotherSchema.version &&
                ModelHelper.versionCompare(anotherSchema.version, schema.version) === 1
            ));
        if (newVersions && newVersions.length !== 0) {
            schema.newVersions = newVersions.reverse();
        }
    }
    notifier.completeStep(STEP_VERIFYING);

    notifier.complete();
    return schemas;
}
