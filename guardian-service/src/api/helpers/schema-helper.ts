import {
    ISchema,
    SchemaEntity,
    SchemaStatus,
    SchemaHelper,
    Schema,
    TopicType
} from '@guardian/interfaces';
import path from 'path';
import { readJSON } from 'fs-extra';
import {
    MessageAction,
    MessageServer,
    SchemaMessage,
    TopicConfig,
    TopicHelper,
    Schema as SchemaCollection,
    DatabaseServer,
    Users,
    SchemaConverterUtils,
} from '@guardian/common';
import { INotifier } from '@helpers/notifier';

/**
 * Import Result
 */
export interface ImportResult {
    /**
     * New schema uuid
     */
    schemasMap: {
        /**
         * Old schema id
         */
        oldID: string,
        /**
         * New schema id
         */
        newID: string,
        /**
         * Old schema uuid
         */
        oldUUID: string,
        /**
         * New schema uuid
         */
        newUUID: string,
        /**
         * Old schema iri
         */
        oldIRI: string,
        /**
         * New schema iri
         */
        newIRI: string,
    }[];
    /**
     * Errors
     */
    errors: any[];
}

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
        const existingSchemas = await DatabaseServer.getSchema({
            uuid: schema.uuid,
            system: true
        });
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
 * Get defs
 * @param schema
 */
export function getDefs(schema: ISchema): string[] {
    try {
        let document: any = schema.document;
        if (typeof document === 'string') {
            document = JSON.parse(document);
        }
        if (!document.$defs) {
            return [];
        }
        return Object.keys(document.$defs);
    } catch (error) {
        return [];
    }
}

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
 * Check circular dependency in schema
 * @param schema Schema
 * @returns Does circular dependency exists
 */
export function checkForCircularDependency(schema: ISchema): boolean {
    return schema.document?.$defs && schema.document.$id
        ? Object.keys(schema.document.$defs).includes(schema.document.$id)
        : false;
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
 * Update schema document
 * @param schema Schema
 */
export async function updateSchemaDocument(schema: SchemaCollection): Promise<void> {
    if (!schema) {
        throw new Error(`There is no schema to update document`);
    }
    const allSchemasInTopic = await DatabaseServer.getSchemas({ topicId: schema.topicId });
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
export function fixSchemaDefsOnImport(iri: string, schemas: Schema[], map: any): boolean {
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
 * Create schema
 * @param newSchema
 * @param owner
 */
export async function createSchema(
    newSchema: ISchema,
    owner: string,
    notifier: INotifier
): Promise<SchemaCollection> {
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
