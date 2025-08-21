import { GeoJsonContext, IOwner, IRootConfig, SchemaHelper, SchemaStatus, SentinelHubContext } from '@guardian/interfaces';
import { DatabaseServer, INotificationStep, MessageAction, MessageServer, Schema as SchemaCollection, SchemaMessage, schemasToContext, TopicConfig, UrlType } from '@guardian/common';
import { checkForCircularDependency } from '../common/load-helper.js';
import { incrementSchemaVersion, updateSchemaDefs, updateSchemaDocument } from './schema-helper.js';
import { publishSchemaTags } from '../tag/tag-publish-helper.js';
import { SchemaImportExportHelper } from './schema-import-helper.js';

/**
 * Check access
 * @param schema
 * @param user
 */
export async function accessSchema(
    schema: SchemaCollection,
    user: IOwner,
    action: string
): Promise<boolean> {
    if (!schema) {
        throw new Error('Schema does not exist.');
    }
    if (user.owner !== schema.owner) {
        throw new Error(`Insufficient permissions to ${action} the schema.`);
    }
    if (user.creator === schema.creator) {
        return true;
    }
    // if (user.published && schema.status !== SchemaStatus.PUBLISHED) {
    //     throw new Error(`Insufficient permissions to ${action} the schema.`);
    // }
    // if (user.assigned) {
    //     const assigned = await DatabaseServer.getAssignedEntity(AssignedEntityType.Schema, schema.id, user.creator);
    //     if (!assigned) {
    //         throw new Error(`Insufficient permissions to ${action} the schema.`);
    //     }
    // }
    return true;
}

/**
 * Generate Schema Context
 * @param item
 */
export function generateSchemaContext(item: SchemaCollection) {
    const itemDocument = item.document;
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
    const names = Object.keys(itemDocument.properties);
    for (const name of names) {
        const field = SchemaHelper.parseProperty(name, itemDocument.properties[name]);
        if (!field.type) {
            throw new Error(`Field type is not set. Field: ${name}, Schema: ${item.uuid}`);
        }
        if (field.isRef && (!itemDocument.$defs || !itemDocument.$defs[field.type])) {
            throw new Error(`Dependent schema not found: ${item.iri}. Field: ${name}`);
        }
    }
    let additionalContexts: Map<string, any>;
    if (itemDocument.$defs && (itemDocument.$defs['#GeoJSON'] || itemDocument.$defs['#SentinelHUB'])) {
        additionalContexts = new Map<string, any>();
        if (itemDocument.$defs['#GeoJSON']) {
            additionalContexts.set('#GeoJSON', GeoJsonContext);
        }
        if (itemDocument.$defs['#SentinelHUB']) {
            additionalContexts.set('#SentinelHUB', SentinelHubContext);
        }
    }
    return schemasToContext([...defsArray, itemDocument], additionalContexts);
}

/**
 * Publish schema
 * @param item
 * @param user
 * @param messageServer
 * @param type
 */
export async function publishSchema(
    item: SchemaCollection,
    user: IOwner,
    messageServer: MessageServer,
    type: MessageAction,
    notifier: INotificationStep
): Promise<SchemaCollection> {
    if (checkForCircularDependency(item)) {
        throw new Error(`There is circular dependency in schema: ${item.iri}`);
    }

    item.context = generateSchemaContext(item);

    const relationships = await SchemaImportExportHelper.exportSchemas([item.id]);

    const message = new SchemaMessage(type || MessageAction.PublishSchema);
    message.setDocument(item);
    message.setRelationships(relationships);
    const result = await messageServer
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: user.id,
            interception: user.id,
            notifier: notifier.minimize(true)
        });

    const messageId = result.getId();
    const topicId = result.getTopicId();
    const contextUrl = result.getContextUrl(UrlType.url);
    const documentUrl = result.getDocumentUrl(UrlType.url);

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;
    item.messageId = messageId;
    item.topicId = topicId;
    item.sourceVersion = '';

    SchemaHelper.updateIRI(item);

    return item;
}

/**
 * Publish schemas
 * @param schemas
 * @param messageServer
 * @param owner
 * @param notifier
 */
export async function publishSchemas(
    schemas: Iterable<SchemaCollection>,
    owner: IOwner,
    messageServer: MessageServer,
    type: MessageAction,
    notifier: INotificationStep
): Promise<void> {
    const tasks = [];
    for (const schema of schemas) {
        tasks.push(publishSchema(schema, owner, messageServer, type, notifier));
    }
    await Promise.all(tasks);
}

/**
 * Save schemas
 * @param schemas
 * @param messageServer
 * @param owner
 * @param notifier
 */
export async function saveSchemas(
    schemas: Iterable<SchemaCollection>
): Promise<void> {
    for (const schema of schemas) {
        await DatabaseServer.createAndSaveSchema(schema);
    }
}

/**
 * Publishing schemas in defs
 * @param defs Definitions
 * @param user
 * @param root HederaAccount
 */
export async function publishDefsSchemas(
    defs: any,
    user: IOwner,
    root: IRootConfig,
    schemaMap: Map<string, string> | null,
    notifier: INotificationStep,
    userId: string | null
) {
    if (!defs) {
        return;
    }
    const schemasIdsInDocument = Object.keys(defs);
    for (const schemaId of schemasIdsInDocument) {
        let schema = await DatabaseServer.getSchema({
            iri: schemaId
        });
        if (schema && schema.status !== SchemaStatus.PUBLISHED) {
            schema = await incrementSchemaVersion(schema.topicId, schema.iri, user);
            await findAndPublishSchema(
                schema.id,
                schema.version,
                user,
                root,
                notifier.getStepById(schema.id),
                schemaMap,
                userId
            );
        }
    }
}

/**
 * Find and publish schema
 * @param id
 * @param version
 * @param user
 * @param root
 * @param notifier
 */
export async function findAndPublishSchema(
    id: string,
    version: string,
    user: IOwner,
    root: IRootConfig,
    notifier: INotificationStep,
    schemaMap: Map<string, string> | null,
    userId: string | null
): Promise<SchemaCollection> {
    // <-- Steps
    const STEP_RESOLVE_TOPIC = 'Resolve topic';
    const STEP_PUBLISH_RELATED_SCHEMAS = 'Publish related schemas';
    const STEP_PUBLISH_SCHEMA = 'Publish schema';
    const STEP_PUBLISH_TAGS = 'Publish tags';
    const STEP_SAVE = 'Save';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_TOPIC, 5);
    notifier.addStep(STEP_PUBLISH_RELATED_SCHEMAS, 40);
    notifier.addStep(STEP_PUBLISH_SCHEMA, 40);
    notifier.addStep(STEP_PUBLISH_TAGS, 10);
    notifier.addStep(STEP_SAVE, 5);
    notifier.start();

    let item = await DatabaseServer.getSchema(id);
    await accessSchema(item, user, 'publish');

    if (!item.topicId || item.topicId === 'draft') {
        throw new Error('Invalid topicId');
    }
    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    notifier.startStep(STEP_RESOLVE_TOPIC);
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topic);
    notifier.completeStep(STEP_RESOLVE_TOPIC);

    notifier.startStep(STEP_PUBLISH_RELATED_SCHEMAS);
    const oldSchemaIri = item.iri;
    await publishDefsSchemas(
        item.document?.$defs,
        user,
        root,
        schemaMap,
        notifier.getStep(STEP_PUBLISH_RELATED_SCHEMAS),
        userId
    );
    item = await DatabaseServer.getSchema(id);
    notifier.completeStep(STEP_PUBLISH_RELATED_SCHEMAS);

    notifier.startStep(STEP_PUBLISH_SCHEMA);
    SchemaHelper.updateVersion(item, version);
    item = await publishSchema(
        item,
        user,
        messageServer,
        MessageAction.PublishSchema,
        notifier
    );
    notifier.completeStep(STEP_PUBLISH_SCHEMA);

    notifier.startStep(STEP_PUBLISH_TAGS);
    await publishSchemaTags(item, user, root, userId);
    notifier.completeStep(STEP_PUBLISH_TAGS);

    notifier.startStep(STEP_SAVE);
    await updateSchemaDocument(item);
    await updateSchemaDefs(item.iri, oldSchemaIri);
    notifier.completeStep(STEP_SAVE);

    notifier.complete();

    if (schemaMap) {
        const newSchemaIri = item.iri;
        schemaMap.set(oldSchemaIri, newSchemaIri);
    }

    return item;
}

/**
 * Publish system schema
 * @param item
 * @param user
 * @param messageServer
 * @param type
 * @param notifier
 */
export async function publishSystemSchema(
    item: SchemaCollection,
    user: IOwner,
    messageServer: MessageServer,
    type: MessageAction,
    notifier: INotificationStep
): Promise<SchemaCollection> {
    notifier.start();
    delete item.id;
    delete item._id;
    item.readonly = true;
    item.system = false;
    item.active = false;
    item.version = undefined;
    item.topicId = messageServer.getTopic();
    SchemaHelper.setVersion(item, undefined, undefined);
    const result = await publishSchema(item, user, messageServer, type, notifier);
    notifier.complete();
    return result;
}

/**
 * Publish system schemas
 * @param systemSchemas
 * @param messageServer
 * @param user
 * @param notifier
 */
export async function publishSystemSchemas(
    systemSchemas: SchemaCollection[],
    messageServer: MessageServer,
    user: IOwner,
    notifier: INotificationStep
): Promise<void> {
    notifier.start();
    notifier.setEstimate(systemSchemas.length);
    const tasks = [];
    let index = 0;
    for (const schema of systemSchemas) {
        if (schema) {
            const step = notifier.addStep(`${schema.name || '-'}`);
            schema.creator = user.creator;
            schema.owner = user.owner;
            tasks.push(publishSystemSchema(
                schema,
                user,
                messageServer,
                MessageAction.PublishSystemSchema,
                step
            ));
            index++;
        }
    }
    const items = await Promise.all(tasks);
    for (const schema of items) {
        await DatabaseServer.createAndSaveSchema(schema);
    }
    notifier.complete();
}

/**
 * Find and publish schema
 * @param item
 * @param version
 * @param user
 */
export async function findAndDryRunSchema(
    item: SchemaCollection,
    version: string,
    user: IOwner
): Promise<SchemaCollection> {
    await accessSchema(item, user, 'publish')

    if (!item.topicId) {
        throw new Error('Invalid topicId');
    }

    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    item.context = generateSchemaContext(item);
    // item.status = SchemaStatus.PUBLISHED;

    SchemaHelper.updateIRI(item);
    await DatabaseServer.updateSchema(item.id, item);
    return item;
}
