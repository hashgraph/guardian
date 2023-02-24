import { Schema as SchemaCollection } from '@entity/schema';
import {
    ISchema,
    SchemaEntity,
    SchemaStatus,
    TopicType,
    SchemaHelper,
    GenerateUUIDv4,
    Schema,
    IRootConfig,
} from '@guardian/interfaces';
import path from 'path';
import { readJSON } from 'fs-extra';
import { MessageAction, MessageServer, SchemaMessage, TopicConfig, TopicHelper, UrlType } from '@hedera-modules';
import { replaceValueRecursive } from '@helpers/utils';
import { Users } from '@helpers/users';
import { DatabaseServer } from '@database-modules';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { SchemaConverterUtils } from '@helpers/schema-converter-utils';
import { schemasToContext } from '@guardian/common';

export const schemaCache = {};

/**
 * Creation of default schemas.
 */
export async function setDefaultSchema() {
    const fileConfig = path.join(process.cwd(), 'system-schemas', 'system-schemas.json');
    let fileContent: any;
    try {
        fileContent = await readJSON(fileConfig);
    } catch (error) {
        throw new Error('you need to create a file \'system-schemas.json\'');
    }

    const map: any = {};
    for (const schema of fileContent) {
        map[schema.entity] = schema;
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_NFTOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_NFTOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_TOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.STANDARD_REGISTRY)) {
        throw new Error(`You need to fill ${SchemaEntity.STANDARD_REGISTRY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.WIPE_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.WIPE_TOKEN} field in system-schemas.json file`);
    }

    const fn = async (schema: any) => {
        const existingSchemas = await DatabaseServer.getSchema({ uuid: schema.uuid, system: true });
        if (existingSchemas) {
            console.log(`Skip schema: ${schema.uuid}`);
            return;
        }
        schema.owner = null;
        schema.creator = null;
        schema.readonly = true;
        schema.system = true;
        schema.active = true;
        await DatabaseServer.createAndSaveSchema(schema);
        console.log(`Created schema: ${schema.uuid}`);
    }

    await fn(map[SchemaEntity.MINT_NFTOKEN]);
    await fn(map[SchemaEntity.MINT_TOKEN]);
    await fn(map[SchemaEntity.RETIRE_TOKEN]);
    await fn(map[SchemaEntity.POLICY]);
    await fn(map[SchemaEntity.STANDARD_REGISTRY]);
    await fn(map[SchemaEntity.WIPE_TOKEN]);
    await fn(map[SchemaEntity.ISSUER]);
    await fn(map[SchemaEntity.USER_ROLE]);
    await fn(map[SchemaEntity.CHUNK]);
    await fn(map[SchemaEntity.ACTIVITY_IMPACT]);
    await fn(map[SchemaEntity.TOKEN_DATA_SOURCE]);
}

/**
 * Check circular dependency in schema
 * @param schema Schema
 * @returns Does circular dependency exists
 */
function checkForCircularDependency(schema: ISchema) {
    return schema.document?.$defs && schema.document.$id
        ? Object.keys(schema.document.$defs).includes(schema.document.$id)
        : false;
}

/**
 * Increment schema version
 * @param iri
 * @param owner
 */
export async function incrementSchemaVersion(iri: string, owner: string): Promise<SchemaCollection> {
    if (!owner || !iri) {
        throw new Error(`Invalid increment schema version parameter`);
    }

    const schema = await DatabaseServer.getSchema({ iri, owner });

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
 * Create schema
 * @param newSchema
 * @param owner
 */
async function createSchema(newSchema: ISchema, owner: string, notifier: INotifier): Promise<SchemaCollection> {
    if (checkForCircularDependency(newSchema)) {
        throw new Error(`There is circular dependency in schema: ${newSchema.iri}`);
    }
    delete newSchema.id;
    delete newSchema._id;
    const users = new Users();
    notifier.start('Resolve Hedera account');
    const root = await users.getHederaAccount(owner);
    notifier.completedAndStart('Save in DB');
    if (newSchema) {
        delete newSchema.status;
    }
    const schemaObject = DatabaseServer.createSchema(newSchema);
    notifier.completedAndStart('Resolve Topic');
    let topic: TopicConfig;
    if (newSchema.topicId) {
        topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(newSchema.topicId), true);
    }

    if (!topic) {
        const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey);
        topic = await topicHelper.create({
            type: TopicType.SchemaTopic,
            name: TopicType.SchemaTopic,
            description: TopicType.SchemaTopic,
            owner,
            policyId: null,
            policyUUID: null
        });
        await topic.saveKeys();
        await DatabaseServer.saveTopic(topic.toObject());
        await topicHelper.twoWayLink(topic, null, null);
    }

    SchemaHelper.updateIRI(schemaObject);
    schemaObject.status = SchemaStatus.DRAFT;
    schemaObject.topicId = topic.topicId;
    schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;
    schemaObject.codeVersion = SchemaConverterUtils.VERSION;
    const errorsCount = await DatabaseServer.getSchemasCount({
        where: {
            iri: {
                $eq: schemaObject.iri
            },
            $or: [
                {
                    topicId: {
                        $ne: schemaObject.topicId
                    }
                },
                {
                    uuid: {
                        $ne: schemaObject.uuid
                    }
                }
            ]
        }
    });
    if (errorsCount > 0) {
        throw new Error('Schema identifier already exist');
    }

    notifier.completedAndStart('Save to IPFS & Hedera');
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
    const message = new SchemaMessage(MessageAction.CreateSchema);
    message.setDocument(schemaObject);
    await messageServer.setTopicObject(topic).sendMessage(message);

    notifier.completedAndStart('Update schema in DB');
    const savedSchema = await DatabaseServer.saveSchema(schemaObject);
    notifier.completed();
    return savedSchema;
}

/**
 * Import schema by files
 * @param owner
 * @param files
 * @param topicId
 */
export async function importSchemaByFiles(
    owner: string,
    files: ISchema[],
    topicId: string,
    notifier: INotifier
): Promise<{
    /**
     * New schema uuid
     */
    schemasMap: any[];
    /**
     * Errors
     */
    errors: any[];
}> {
    notifier.start('Import schemas');
    const uuidMap: Map<string, string> = new Map();
    for (const file of files) {
        const newUUID = GenerateUUIDv4();
        const uuid = file.iri ? file.iri.substring(1) : null;
        if (uuid) {
            uuidMap.set(uuid, newUUID);
        }
        file.uuid = newUUID;
        file.iri = '#' + newUUID;
        file.documentURL = null;
        file.contextURL = null;
        file.messageId = null;
        file.creator = owner;
        file.owner = owner;
        file.topicId = topicId;
        file.status = SchemaStatus.DRAFT;
    }

    notifier.info(`Found ${files.length} schemas`);
    for (const file of files) {
        file.document = replaceValueRecursive(file.document, uuidMap);
        file.context = replaceValueRecursive(file.context, uuidMap);
        SchemaHelper.setVersion(file, '', '');
    }

    const parsedSchemas = files.map(item => new Schema(item, true));
    const updatedSchemasMap = {};
    const errors: any[] = [];
    for (const file of files) {
        const valid = fixSchemaDefsOnImport(file.iri, parsedSchemas, updatedSchemasMap);
        if (!valid) {
            errors.push({
                uuid: file.uuid,
                name: file.name,
                error: 'invalid defs'
            });
        }
    }

    let num: number = 0;
    for (let file of files) {
        const parsedSchema = updatedSchemasMap[file.iri];
        file.document = parsedSchema.document;
        file = SchemaConverterUtils.SchemaConverter(file);
        await createSchema(file, owner, emptyNotifier());
        num++;
        notifier.info(`Schema ${num} (${file.name || '-'}) created`);
    }

    const schemasMap: any[] = [];
    uuidMap.forEach((v, k) => {
        schemasMap.push({
            oldUUID: k,
            newUUID: v,
            oldIRI: `#${k}`,
            newIRI: `#${v}`
        })
    });

    notifier.completed();
    return { schemasMap, errors };
}

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
            throw new Error(`Field type not set. Field: ${name}`);
        }
        if (field.isRef && (!itemDocument.$defs || !itemDocument.$defs[field.type])) {
            throw new Error(`Dependent schema not found: ${item.iri}. Field: ${name}`);
        }
    }

    item.context = schemasToContext([...defsArray, itemDocument]);

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
 * Update defs in related schemas
 * @param schemaId Schema id
 */
async function updateSchemaDefs(schemaId: string, oldSchemaId?: string) {
    if (!schemaId) {
        return;
    }

    const schema = await DatabaseServer.getSchema({ 'document.$id': schemaId });
    if (!schema) {
        throw new Error(`Can not find schema ${schemaId}`);
    }

    const schemaDocument = schema.document;
    if (!schemaDocument) {
        return;
    }

    const schemaDefs = schema.document.$defs;
    delete schemaDocument.$defs;

    const filters = {};
    filters[`document.$defs.${oldSchemaId || schemaId}`] = { $exists: true };
    const relatedSchemas = await DatabaseServer.getSchemas(filters);
    for (const rSchema of relatedSchemas) {
        if (oldSchemaId) {
            const document = JSON.stringify(rSchema.document) as string;
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
 * Update schema document
 * @param schema Schema
 */
async function updateSchemaDocument(schema: SchemaCollection): Promise<void> {
    if (!schema) {
        throw new Error(`There is no schema to update document`);
    }
    const allSchemasInTopic = await DatabaseServer.getSchemas({
        topicId: schema.topicId,
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
function fixSchemaDefsOnImport(iri: string, schemas: Schema[], map: any): boolean {
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
            'document.$id': schemaId
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
    const oldSchemaId = item.document?.$id;
    await publishDefsSchemas(item.document?.$defs, owner, root);
    item = await DatabaseServer.getSchema(id);

    notifier.completedAndStart('Resolve topic');
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
    const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey)
        .setTopicObject(topic);
    notifier.completedAndStart('Publish schema');

    SchemaHelper.updateVersion(item, version);
    item = await publishSchema(item, messageServer, MessageAction.PublishSchema);

    notifier.completedAndStart('Update in DB');
    await updateSchemaDocument(item);
    await updateSchemaDefs(item.document?.$id, oldSchemaId);
    notifier.completed();
    return item;
}

/**
 * Find and publish schema
 * @param item
 * @param version
 * @param owner
 */
export async function findAndDryRunSchema(item: SchemaCollection, version: string, owner: string): Promise<SchemaCollection> {
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
            throw new Error(`Field type not set. Field: ${name}`);
        }
        if (field.isRef && (!itemDocument.$defs || !itemDocument.$defs[field.type])) {
            throw new Error(`Dependent schema not found: ${item.iri}. Field: ${name}`);
        }
    }
    item.context = schemasToContext([...defsArray, itemDocument]);
    // item.status = SchemaStatus.PUBLISHED;

    SchemaHelper.updateIRI(item);
    await DatabaseServer.updateSchema(item.id, item);
    return item;
}

/**
 * Delete schema
 * @param schemaId Schema ID
 * @param notifier Notifier
 */
export async function deleteSchema(schemaId: any, notifier: INotifier) {
    if (!schemaId) {
        return;
    }

    const item = await DatabaseServer.getSchema(schemaId);
    if (!item) {
        throw new Error('Schema not found');
    }
    if (item.status !== SchemaStatus.DRAFT) {
        throw new Error('Schema is not in draft status');
    }

    notifier.info(`Delete schema ${item.name}`);
    if (item.topicId) {
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
        if (topic) {
            const users = new Users();
            const root = await users.getHederaAccount(item.owner);
            const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey);
            const message = new SchemaMessage(MessageAction.DeleteSchema);
            message.setDocument(item);
            await messageServer.setTopicObject(topic)
                .sendMessage(message);
        }
    }
    await DatabaseServer.deleteSchemas(item.id);
}
