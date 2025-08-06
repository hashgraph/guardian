import { GeoJsonContext, IOwner, IRootConfig, ISchemaDocument, ModuleStatus, Schema, SchemaHelper, SchemaStatus, SentinelHubContext } from '@guardian/interfaces';
import { DatabaseServer, MessageAction, MessageServer, Schema as SchemaCollection, SchemaMessage, SchemaPackageMessage, schemasToContext, TopicConfig, UrlType } from '@guardian/common';
import { checkForCircularDependency } from '../common/load-helper.js';
import { incrementSchemaVersion, updateSchemaDefs, updateSchemaDocument } from './schema-helper.js';
import { publishSchemaTags } from '../tag/tag-publish-helper.js';
import { SchemaImportExportHelper } from './schema-import-helper.js';
import { emptyNotifier, INotifier } from '../../notifier.js';

function checkSchemaProps(item: SchemaCollection, document: ISchemaDocument) {
    const names = Object.keys(document.properties);
    for (const name of names) {
        const field = SchemaHelper.parseProperty(name, document.properties[name]);
        if (!field.type) {
            throw new Error(`Field type is not set. Field: ${name}, Schema: ${item.uuid}`);
        }
        if (field.isRef && (!document.$defs || !document.$defs[field.type])) {
            console.debug(field);
            console.debug(document);
            throw new Error(`Dependent schema not found: ${item.iri}, Field: ${name}, Field Type: ${field.type}`);
        }
    }
}

function getAdditionalContexts(document: ISchemaDocument) {
    let additionalContexts: Map<string, any> | undefined;
    if (document.$defs && (document.$defs['#GeoJSON'] || document.$defs['#SentinelHUB'])) {
        additionalContexts = new Map<string, any>();
        if (document.$defs['#GeoJSON']) {
            additionalContexts.set('#GeoJSON', GeoJsonContext);
        }
        if (document.$defs['#SentinelHUB']) {
            additionalContexts.set('#SentinelHUB', SentinelHubContext);
        }
    }
    return additionalContexts;
}

/**
 * Generate Schema Context
 * @param item
 */
export function generateSchemaContext(item: SchemaCollection) {
    const itemDocument = item.document;
    checkSchemaProps(item, itemDocument);
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
    const additionalContexts = getAdditionalContexts(itemDocument);
    return schemasToContext([...defsArray, itemDocument], additionalContexts);
}

export function generatePackage(options: {
    name: string,
    version: string,
    type: MessageAction,
    schemas: SchemaCollection[],
    owner: IOwner,
}) {
    const {
        name,
        version,
        owner,
        schemas,
    } = options;

    const defsArray = new Map<string, ISchemaDocument>();
    for (const item of schemas) {
        const itemDocument = item.document;
        checkSchemaProps(item, itemDocument);
        defsArray.set(itemDocument.$id, itemDocument);
        if (itemDocument.$defs) {
            for (const def of Object.values(itemDocument.$defs)) {
                defsArray.set(def.$id, def);
            }
        }
    }

    let additionalContexts: Map<string, any> | undefined;
    if (defsArray.has('#GeoJSON') || defsArray.has('#SentinelHUB')) {
        additionalContexts = new Map<string, any>();
        if (defsArray.has('#GeoJSON')) {
            additionalContexts.set('#GeoJSON', GeoJsonContext);
        }
        if (defsArray.has('#SentinelHUB')) {
            additionalContexts.set('#SentinelHUB', SentinelHubContext);
        }
    }


    const context = schemasToContext(
        Array.from(defsArray.values()),
        additionalContexts,
        {
            vocab: name
        }
    );

    const document: any = {
        name,
        version
    };

    for (const item of schemas) {
        document[item.iri] = item.document;
    }

    return {
        name,
        version,
        owner: owner.owner,
        document,
        context
    }
}

async function generateSchemaVersion(schema: SchemaCollection): Promise<SchemaCollection> {
    if (schema.status === SchemaStatus.PUBLISHED) {
        return schema;
    }

    const { previousVersion } = SchemaHelper.getVersion(schema);
    let newVersion = '1.0.0';
    if (previousVersion) {
        const schemas = await DatabaseServer.getSchemas({ uuid: schema.uuid, topicId: schema.topicId });
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

async function getPublishedTopics(topicId: string): Promise<string[]> {
    const publishedToolsTopics = await DatabaseServer.getTools({
        status: ModuleStatus.PUBLISHED,
    }, {
        fields: ['topicId'],
    });
    return [topicId].concat(publishedToolsTopics.map((tool) => tool.topicId));
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
    type: MessageAction
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
            interception: user.id
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
    notifier: INotifier
): Promise<SchemaCollection> {
    const type = MessageAction.PublishSystemSchema;
    delete item.id;
    delete item._id;
    item.readonly = true;
    item.system = false;
    item.active = false;
    item.version = undefined;
    item.creator = user.creator;
    item.owner = user.owner;
    item.topicId = messageServer.getTopic();
    SchemaHelper.setVersion(item, undefined, undefined);
    const result = await publishSchema(item, user, messageServer, type);
    if (notifier) {
        notifier.info(`Schema ${result.name || '-'} published`);
    }
    return result;
}

/**
 * Publish schemas
 * @param schemas
 * @param owner
 * @param messageServer
 * @param type
 */
export async function publishSchemas(
    schemas: Iterable<SchemaCollection>,
    owner: IOwner,
    messageServer: MessageServer,
    type: MessageAction
): Promise<void> {
    const tasks = [];
    for (const schema of schemas) {
        tasks.push(publishSchema(schema, owner, messageServer, type));
    }
    const items = await Promise.all(tasks);
    for (const schema of items) {
        await DatabaseServer.createAndSaveSchema(schema);
    }
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
    notifier: INotifier
): Promise<void> {
    const tasks = [];
    for (const schema of systemSchemas) {
        if (schema) {
            tasks.push(publishSystemSchema(schema, user, messageServer, notifier));
        }
    }
    const items = await Promise.all(tasks);
    for (const schema of items) {
        await DatabaseServer.createAndSaveSchema(schema);
    }
}

export async function searchSchemaDefs(
    schema: SchemaCollection,
    topicIds: string[],
    map: Map<string, SchemaCollection>
) {
    if (!schema || map.has(schema.iri)) {
        return;
    }
    map.set(schema.iri, schema);
    if (schema?.document?.$defs) {
        const schemasIdsInDocument = Object.keys(schema.document.$defs);
        for (const schemaId of schemasIdsInDocument) {
            const sub = await DatabaseServer.getSchema({
                iri: schemaId,
                topicId: { $in: topicIds }
            });
            await searchSchemaDefs(sub, topicIds, map);
        }
    };
}

/**
 * Publish schemas
 * @param schemas
 * @param owner
 * @param messageServer
 * @param type
 */
export async function publishSchemasPackage(options: {
    name: string,
    version: string,
    type: MessageAction,
    schemas: SchemaCollection[],
    owner: IOwner,
    server: MessageServer,
    notifier: INotifier,
    staticSchemas?: boolean,
    schemaMap?: Map<string, string>,
}): Promise<Map<string, string>> {
    const {
        type,
        schemas,
        owner,
        server,
        schemaMap,
        staticSchemas,
        notifier
    } = options;

    const topicId = server.getTopic();

    const idsMap = schemaMap || new Map<string, string>();

    const map = new Map<string, SchemaCollection>();
    const publishedTopics = await getPublishedTopics(topicId);
    for (const schema of schemas) {
        await searchSchemaDefs(schema, publishedTopics, map);
    }

    const publishedSchemas: SchemaCollection[] = [];
    const draftSchemas: SchemaCollection[] = [];
    for (const item of map.values()) {
        if (item.status !== SchemaStatus.PUBLISHED && item.topicId === topicId) {
            draftSchemas.push(item);
        } else {
            publishedSchemas.push(item);
        }
    }

    // <-- Update uuid & version
    for (const item of draftSchemas) {
        if (checkForCircularDependency(item)) {
            throw new Error(`There is circular dependency in schema: ${item.iri}`);
        }
    }

    for (const item of draftSchemas) {
        const oldSchemaIri = item.iri;
        await generateSchemaVersion(item);
        SchemaHelper.updateVersion(item, item.version);
        item.status = SchemaStatus.PUBLISHED;
        item.topicId = topicId;
        item.sourceVersion = '';
        item.context = generateSchemaContext(item);
        SchemaHelper.updateIRI(item);
        const newSchemaIri = item.iri;
        idsMap.set(oldSchemaIri, newSchemaIri);
    }

    if (!staticSchemas) {
        const parsedSchemas = new Array(draftSchemas.length);
        for (let i = 0; i < draftSchemas.length; i++) {
            parsedSchemas[i] = new Schema(draftSchemas[i], true);
        }

        for (const parsedSchema of parsedSchemas) {
            for (const [oldSchemaIri, newSchemaIri] of idsMap.entries()) {
                replaceSchemaIds(parsedSchema, oldSchemaIri, newSchemaIri);
            }
            parsedSchema.update(parsedSchema.fields, parsedSchema.conditions);
        }

        const allParsedSchemas = publishedSchemas.map(item => new Schema(item));
        updateSchemasRefs(parsedSchemas, allParsedSchemas);

        for (let i = 0; i < draftSchemas.length; i++) {
            draftSchemas[i].document = parsedSchemas[i].document;
        }
    }
    // Update uuid & version -->

    const packageDocuments = generatePackage({ ...options, schemas: publishedSchemas });

    const message = new SchemaPackageMessage(type);
    message.setDocument(packageDocuments);
    message.setMetadata(draftSchemas, publishedSchemas);
    const result = await server
        .sendMessage(message, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });

    const messageId = result.getId();
    const contextUrl = result.getContextUrl(UrlType.url);
    const documentUrl = result.getDocumentUrl(UrlType.url);

    for (const item of draftSchemas) {
        item.documentURL = documentUrl;
        item.contextURL = contextUrl;
        item.messageId = messageId;
    }

    for (const schema of draftSchemas) {
        if (schema.id) {
            await DatabaseServer.updateSchema(schema.id, schema);
        } else {
            await DatabaseServer.createAndSaveSchema(schema);
        }
    }

    for (const [oldSchemaIri, newSchemaIri] of idsMap.entries()) {
        await updateSchemaDefs(newSchemaIri, oldSchemaIri);
    }

    for (const schema of draftSchemas) {
        await publishSchemaTags(schema, owner, server);
    }

    return idsMap;
}

/**
 * Publish system schemas
 * @param systemSchemas
 * @param messageServer
 * @param owner
 * @param notifier
 */
export async function publishSystemSchemasPackage(options: {
    name: string,
    version: string,
    schemas: SchemaCollection[],
    owner: IOwner,
    server: MessageServer,
    notifier: INotifier
}): Promise<Map<string, string>> {
    const type = MessageAction.PublishSystemSchemas;
    const topicId = options.server.getTopic();
    for (const schema of options.schemas) {
        if (schema) {
            delete schema.id;
            delete schema._id;
            schema.readonly = true;
            schema.system = false;
            schema.active = false;
            schema.version = undefined;
            schema.creator = options.owner.creator;
            schema.owner = options.owner.owner;
            schema.topicId = topicId;
            SchemaHelper.setVersion(schema, undefined, undefined);
        }
    }
    return await publishSchemasPackage({ ...options, type, staticSchemas: true });
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
    notifier: INotifier,
    schemaMap: Map<string, string> | null,
    userId: string | null
): Promise<SchemaCollection> {
    notifier.start('Load schema');

    let item = await DatabaseServer.getSchema(id);
    if (!item) {
        throw new Error('Schema does not exist.');
    }
    if (user.owner !== item.owner) {
        throw new Error(`Insufficient permissions to publish the schema.`);
    }
    if (!item.topicId || item.topicId === 'draft') {
        throw new Error('Invalid topicId');
    }
    if (item.status === SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    notifier.completedAndStart('Publishing related schemas');
    const oldSchemaIri = item.iri;
    await publishDefsSchemas(item.document?.$defs, user, root, schemaMap, userId);
    item = await DatabaseServer.getSchema(id);

    notifier.completedAndStart('Resolve topic');
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, userId);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topic);
    notifier.completedAndStart('Publish schema');

    SchemaHelper.updateVersion(item, version);
    item = await publishSchema(item, user, messageServer, MessageAction.PublishSchema);

    notifier.completedAndStart('Publish tags');
    await publishSchemaTags(item, user, messageServer);

    notifier.completedAndStart('Update in DB');
    await updateSchemaDocument(item);
    await updateSchemaDefs(item.iri, oldSchemaIri);
    notifier.completed();

    if (schemaMap) {
        const newSchemaIri = item.iri;
        schemaMap.set(oldSchemaIri, newSchemaIri);
    }

    return item;
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
            await findAndPublishSchema(schema.id, schema.version, user, root, emptyNotifier(), schemaMap, userId);
        }
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
    if (!item) {
        throw new Error('Schema does not exist.');
    }
    if (user.owner !== item.owner) {
        throw new Error(`Insufficient permissions to publish the schema.`);
    }
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

function replaceSchemaIds(
    parsedSchema: Schema,
    oldSchemaIri: string,
    newSchemaIri: string
) {
    if (oldSchemaIri) {
        if (Array.isArray(parsedSchema?.fields)) {
            for (const field of parsedSchema.fields) {
                if (field.type === oldSchemaIri) {
                    field.type = newSchemaIri;
                }
            }
        }
        if (Array.isArray(parsedSchema?.conditions)) {
            for (const condition of parsedSchema.conditions) {
                if (condition.ifCondition?.field?.type === oldSchemaIri) {
                    condition.ifCondition.field.type = newSchemaIri;
                }
                if (Array.isArray(condition.thenFields)) {
                    for (const field of condition.thenFields) {
                        if (field.type === oldSchemaIri) {
                            field.type = newSchemaIri;
                        }
                    }
                }
                if (Array.isArray(condition.elseFields)) {
                    for (const field of condition.elseFields) {
                        if (field.type === oldSchemaIri) {
                            field.type = newSchemaIri;
                        }
                    }
                }
            }
        }
    }
}

function updateSchemasRefs(schemas: Schema[], allSchemas: Schema[]) {
    const map = new Map<string, Schema>();
    const finished = new Map<string, boolean>();
    finished.set('#GeoJSON', true);
    finished.set('#SentinelHUB', true);

    for (const item of allSchemas) {
        map.set(item.iri, item);
        finished.set(item.iri, true);
    }
    for (const item of schemas) {
        map.set(item.iri, item);
        finished.set(item.iri, false);
        allSchemas.push(item);
    }
    for (const schema of schemas) {
        updateSchemaRefs(schema.iri, map, finished, allSchemas);


    }
}

function updateSchemaRefs(
    iri: string,
    map: Map<string, Schema>,
    finished: Map<string, boolean>,
    allSchemas: Schema[],
) {
    if (finished.get(iri)) {
        return;
    }
    const schema = map.get(iri);
    if (!schema) {
        return;
    }

    for (const field of schema.fields) {
        if (field.isRef && !finished.get(field.type)) {
            updateSchemaRefs(field.type, map, finished, allSchemas);
        }
    }
    schema.updateRefs(allSchemas);
}