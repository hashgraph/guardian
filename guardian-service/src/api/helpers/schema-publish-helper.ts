import {
    SchemaStatus,
    SchemaHelper,
    IRootConfig,
    GeoJsonContext
} from '@guardian/interfaces';

import {
    checkForCircularDependency,
    incrementSchemaVersion,
    updateSchemaDefs,
    updateSchemaDocument
} from './schema-helper';
import {
    schemasToContext,
    MessageAction,
    MessageServer,
    SchemaMessage,
    TopicConfig,
    UrlType,
    DatabaseServer,
    Schema as SchemaCollection
} from '@guardian/common';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { publishSchemaTags } from './../tag.service';

/**
 * Publish schema
 * @param item
 * @param version
 * @param messageServer
 * @param type
 */
export async function publishSchema(
    item: SchemaCollection,
    messageServer: MessageServer,
    type?: MessageAction
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
    if (itemDocument.$defs && itemDocument.$defs['#GeoJSON']) {
        additionalContexts = new Map<string, any>();
        additionalContexts.set('#GeoJSON', GeoJsonContext);
    }

    item.context = schemasToContext([...defsArray, itemDocument], additionalContexts);

    const message = new SchemaMessage(type || MessageAction.PublishSchema);
    message.setDocument(item);
    const result = await messageServer
        .sendMessage(message);

    const messageId = result.getId();
    const topicId = result.getTopicId();
    const contextUrl = result.getContextUrl(UrlType.url);
    const documentUrl = result.getDocumentUrl(UrlType.url);

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;
    item.messageId = messageId;
    item.topicId = topicId;

    SchemaHelper.updateIRI(item);

    return item;
}

/**
 * Publishing schemas in defs
 * @param defs Definitions
 * @param owner Owner
 * @param root HederaAccount
 */
export async function publishDefsSchemas(defs: any, owner: string, root: IRootConfig) {
    if (!defs) {
        return;
    }
    const schemasIdsInDocument = Object.keys(defs);
    for (const schemaId of schemasIdsInDocument) {
        let schema = await DatabaseServer.getSchema({
            iri: schemaId
        });
        if (schema && schema.status !== SchemaStatus.PUBLISHED) {
            schema = await incrementSchemaVersion(schema.iri, owner);
            await findAndPublishSchema(schema.id, schema.version, owner, root, emptyNotifier());
        }
    }
}

/**
 * Find and publish schema
 * @param id
 * @param version
 * @param owner
 * @param root
 * @param notifier
 */
export async function findAndPublishSchema(
    id: string,
    version: string,
    owner: string,
    root: IRootConfig,
    notifier: INotifier
): Promise<SchemaCollection> {
    notifier.start('Load schema');

    let item = await DatabaseServer.getSchema(id);
    if (!item) {
        throw new Error(`Schema not found: ${id}`);
    }
    if (item.creator !== owner) {
        throw new Error('Invalid owner');
    }
    if (!item.topicId) {
        throw new Error('Invalid topicId');
    }
    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    notifier.completedAndStart('Publishing related schemas');
    const oldSchemaIri = item.iri;
    await publishDefsSchemas(item.document?.$defs, owner, root);
    item = await DatabaseServer.getSchema(id);

    notifier.completedAndStart('Resolve topic');
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
        .setTopicObject(topic);
    notifier.completedAndStart('Publish schema');

    SchemaHelper.updateVersion(item, version);
    item = await publishSchema(item, messageServer, MessageAction.PublishSchema);

    notifier.completedAndStart('Publish tags');
    await publishSchemaTags(item, root);

    notifier.completedAndStart('Update in DB');
    await updateSchemaDocument(item);
    await updateSchemaDefs(item.iri, oldSchemaIri);
    notifier.completed();
    return item;
}

/**
 * Publish system schema
 * @param item
 * @param messageServer
 * @param type
 * @param notifier
 */
export async function publishSystemSchema(
    item: SchemaCollection,
    messageServer: MessageServer,
    type?: MessageAction,
    notifier?: INotifier
): Promise<SchemaCollection> {
    delete item.id;
    delete item._id;
    item.readonly = true;
    item.system = false;
    item.active = false;
    item.version = undefined;
    item.topicId = messageServer.getTopic();
    SchemaHelper.setVersion(item, undefined, undefined);
    const result = await publishSchema(item, messageServer, type);
    if (notifier) {
        notifier.info(`Schema ${result.name || '-'} published`);
    }
    return result;
}

/**
 * Publish system schemas
 * @param systemSchemas
 * @param messageServer
 * @param owner
 * @param notifier
 */
export async function publishSystemSchemas(
    systemSchemas: SchemaCollection[],
    messageServer: MessageServer,
    owner: string,
    notifier: INotifier
): Promise<void> {
    const tasks = [];
    for (const schema of systemSchemas) {
        if (schema) {
            schema.creator = owner;
            schema.owner = owner;
            tasks.push(publishSystemSchema(
                schema,
                messageServer,
                MessageAction.PublishSystemSchema,
                notifier
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
 * @param owner
 */
export async function findAndDryRunSchema(
    item: SchemaCollection,
    version: string,
    owner: string
): Promise<SchemaCollection> {
    if (item.creator !== owner) {
        throw new Error('Invalid owner');
    }

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
    if (itemDocument.$defs && itemDocument.$defs['#GeoJSON']) {
        additionalContexts = new Map<string, any>();
        additionalContexts.set('#GeoJSON', GeoJsonContext);
    }

    item.context = schemasToContext([...defsArray, itemDocument], additionalContexts);
    // item.status = SchemaStatus.PUBLISHED;

    SchemaHelper.updateIRI(item);
    await DatabaseServer.updateSchema(item.id, item);
    return item;
}
