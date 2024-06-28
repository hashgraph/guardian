import { GeoJsonContext, IOwner, SchemaHelper, SchemaStatus, SentinelHubContext } from '@guardian/interfaces';
import { checkForCircularDependency, incrementSchemaVersion, updateSchemaDefs, updateSchemaDocument } from './schema-helper.js';
import { DatabaseServer, MessageAction, MessageServer, Schema as SchemaCollection, SchemaMessage, schemasToContext, TopicConfig, UrlType } from '@guardian/common';
import { emptyNotifier, INotifier } from '../../helpers/notifier.js';
import { publishSchemaTags } from './../tag.service.js';
import { exportSchemas } from './schema-import-export-helper.js';
import { IRootConfig } from '../../interfaces/root-config.interface.js';

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
 * Publish schema
 * @param item
 * @param user
 * @param messageServer
 * @param type
 * @param userId
 */
export async function publishSchema(
    item: SchemaCollection,
    user: IOwner,
    messageServer: MessageServer,
    type?: MessageAction,
    userId?: string
): Promise<SchemaCollection> {
    if (checkForCircularDependency(item)) {
        throw new Error(`There is circular dependency in schema: ${item.iri}`);
    }
    const itemDocument = item.document;
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];

    const names = Object.keys(itemDocument.properties);
    for (const name of names) {
        const field = SchemaHelper.parseProperty(name, itemDocument.properties[name]);
        if (!field.type) {
            throw new Error(`Field type is not set. Field: ${name}`);
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

    item.context = schemasToContext([...defsArray, itemDocument], additionalContexts);

    const relationships = await exportSchemas([item.id], user);

    const message = new SchemaMessage(type || MessageAction.PublishSchema);
    message.setDocument(item);
    message.setRelationships(relationships);
    const result = await messageServer
        .sendMessage(message, true, null, userId);

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
 * Publishing schemas in defs
 * @param defs Definitions
 * @param user
 * @param root HederaAccount
 * @param userId
 */
export async function publishDefsSchemas(
    defs: any,
    user: IOwner,
    root: IRootConfig,
    userId?: string
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
            schema = await incrementSchemaVersion(schema.iri, user);
            await findAndPublishSchema(schema.id, schema.version, user, root, emptyNotifier(), userId);
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
 * @param userId
 */
export async function findAndPublishSchema(
    id: string,
    version: string,
    user: IOwner,
    root: IRootConfig,
    notifier: INotifier,
    userId?: string
): Promise<SchemaCollection> {
    notifier.start('Load schema');

    let item = await DatabaseServer.getSchema(id);
    await accessSchema(item, user, 'publish');

    if (!item.topicId || item.topicId === 'draft') {
        throw new Error('Invalid topicId');
    }
    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    notifier.completedAndStart('Publishing related schemas');
    const oldSchemaIri = item.iri;
    await publishDefsSchemas(item.document?.$defs, user, root, userId);
    item = await DatabaseServer.getSchema(id);

    notifier.completedAndStart('Resolve topic');
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions)
        .setTopicObject(topic);
    notifier.completedAndStart('Publish schema');

    SchemaHelper.updateVersion(item, version);
    item = await publishSchema(item, user, messageServer, MessageAction.PublishSchema, userId);

    notifier.completedAndStart('Publish tags');
    await publishSchemaTags(item, root, userId);

    notifier.completedAndStart('Update in DB');
    await updateSchemaDocument(item);
    await updateSchemaDefs(item.iri, oldSchemaIri);
    notifier.completed();
    return item;
}

/**
 * Publish system schema
 * @param item
 * @param user
 * @param messageServer
 * @param type
 * @param notifier
 * @param userId
 */
export async function publishSystemSchema(
    item: SchemaCollection,
    user: IOwner,
    messageServer: MessageServer,
    type?: MessageAction,
    notifier?: INotifier,
    userId?: string
): Promise<SchemaCollection> {
    delete item.id;
    delete item._id;
    item.readonly = true;
    item.system = false;
    item.active = false;
    item.version = undefined;
    item.topicId = messageServer.getTopic();
    SchemaHelper.setVersion(item, undefined, undefined);
    const result = await publishSchema(item, user, messageServer, type, userId);
    if (notifier) {
        notifier.info(`Schema ${result.name || '-'} published`);
    }
    return result;
}

/**
 * Publish system schemas
 * @param systemSchemas
 * @param messageServer
 * @param user
 * @param notifier
 * @param userId
 */
export async function publishSystemSchemas(
    systemSchemas: SchemaCollection[],
    messageServer: MessageServer,
    user: IOwner,
    notifier: INotifier,
    userId?: string
): Promise<void> {
    const tasks = [];
    for (const schema of systemSchemas) {
        if (schema) {
            schema.creator = user.creator;
            schema.owner = user.owner;
            tasks.push(publishSystemSchema(
                schema,
                user,
                messageServer,
                MessageAction.PublishSystemSchema,
                notifier,
                userId
            ));
        }
    }
    const items = await Promise.all(tasks);
    for (const schema of items) {
        await DatabaseServer.createAndSaveSchema(schema);
    }
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

    const itemDocument = item.document;
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];

    const names = Object.keys(itemDocument.properties);
    for (const name of names) {
        const field = SchemaHelper.parseProperty(name, itemDocument.properties[name]);
        if (!field.type) {
            throw new Error(`Field type is not set. Field: ${name}`);
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

    item.context = schemasToContext([...defsArray, itemDocument], additionalContexts);
    // item.status = SchemaStatus.PUBLISHED;

    SchemaHelper.updateIRI(item);
    await DatabaseServer.updateSchema(item.id, item);
    return item;
}
