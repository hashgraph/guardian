import {
    GenerateUUIDv4,
    ISchema,
    ModelHelper,
    ModuleStatus,
    Schema,
    SchemaCategory,
    SchemaEntity,
    SchemaHelper,
    SchemaStatus
} from '@guardian/interfaces';
import {
    DatabaseServer,
    Logger,
    MessageAction,
    MessageServer,
    MessageType,
    replaceValueRecursive,
    Schema as SchemaCollection,
    SchemaConverterUtils,
    SchemaMessage,
    Tag,
    TagMessage,
    UrlType
} from '@guardian/common';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { importTag } from '@api/helpers/tag-import-export-helper';
import { createSchema, fixSchemaDefsOnImport, getDefs, ImportResult, onlyUnique, SchemaImportResult } from './schema-helper';
import geoJson from '@guardian/interfaces/dist/helpers/geojson-schema/geo-json';

export class SchemaCache {
    /**
     * Schema Cache
     */
    private static readonly map = new Map<string, string>();

    /**
     * Check
     * @param id
     */
    public static hasSchema(id: string) {
        return SchemaCache.map.has(id);
    }

    /**
     * Get schema
     * @param id
     */
    public static getSchema(id: string): any | null {
        try {
            const value = SchemaCache.map.get(id);
            return JSON.parse(value);
        } catch (error) {
            return null;
        }
    }

    /**
     * Set schema
     * @param id
     * @param schema
     */
    public static setSchema(id: string, schema: any): void {
        try {
            const value = JSON.stringify(schema);
            SchemaCache.map.set(id, value)
        } catch (error) {
            return;
        }
    }
};

/**
 * Load schema
 * @param messageId
 * @param owner
 */
export async function loadSchema(messageId: string): Promise<any> {
    const log = new Logger();
    try {
        let schemaToImport = SchemaCache.getSchema(messageId);
        if (!schemaToImport) {
            const messageServer = new MessageServer(null, null);
            log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
            const message = await messageServer.getMessage<SchemaMessage>(messageId, MessageType.Schema);
            log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
            schemaToImport = {
                iri: null,
                uuid: message.uuid,
                hash: '',
                owner: null,
                messageId,
                name: message.name,
                description: message.description,
                entity: message.entity as SchemaEntity,
                version: message.version,
                creator: message.owner,
                topicId: message.getTopicId(),
                codeVersion: message.codeVersion,
                relationships: message.relationships || [],
                status: SchemaStatus.PUBLISHED,
                readonly: false,
                system: false,
                active: false,
                document: message.getDocument(),
                context: message.getContext(),
                documentURL: message.getDocumentUrl(UrlType.url),
                contextURL: message.getContextUrl(UrlType.url)
            }
            schemaToImport = SchemaHelper.updateIRI(schemaToImport);
            SchemaCache.setSchema(messageId, schemaToImport);
        }
        return schemaToImport;
    } catch (error) {
        log.error(error, ['GUARDIAN_SERVICE']);
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

/**
 * Import tags by files
 * @param result
 * @param files
 * @param topicId
 */
export async function importTagsByFiles(
    result: ImportResult,
    files: Tag[],
    notifier: INotifier
): Promise<ImportResult> {
    const { schemasMap } = result;
    const idMap: Map<string, string> = new Map();
    for (const item of schemasMap) {
        idMap.set(item.oldID, item.newID);
        idMap.set(item.oldMessageID, item.newID);
    }
    await importTag(files, idMap);
    return result;
}

/**
 * Export schemas
 * @param ids Schemas ids
 * @returns Schemas to export
 */
export async function exportSchemas(ids: string[]) {
    const schemas = await DatabaseServer.getSchemasByIds(ids);
    const map: any = {};
    const relationships: SchemaCollection[] = [];
    for (const schema of schemas) {
        if (!map[schema.iri]) {
            map[schema.iri] = schema;
            relationships.push(schema);
            const keys = getDefs(schema);
            const defs = await DatabaseServer.getSchemas({
                where: { iri: { $in: keys } }
            });
            for (const element of defs) {
                if (!map[element.iri]) {
                    map[element.iri] = element;
                    relationships.push(element);
                }
            }
        }
    }
    return relationships;
}

export async function getSchemaCategory(topicId: string): Promise<SchemaCategory> {
    if (topicId) {
        const item = await DatabaseServer.getTool({ topicId });
        if (item) {
            return SchemaCategory.TOOL;
        }
    }
    return SchemaCategory.POLICY;
}

/**
 * Import schema by files
 * @param owner
 * @param files
 * @param topicId
 */
export async function importSchemaByFiles(
    category: SchemaCategory,
    owner: string,
    files: ISchema[],
    topicId: string,
    notifier: INotifier
): Promise<ImportResult> {
    notifier.start('Import schemas');

    const schemasMap: SchemaImportResult[] = [];
    const uuidMap: Map<string, string> = new Map();

    for (const file of files) {
        const oldUUID = file.iri ? file.iri.substring(1) : null;
        const newUUID = GenerateUUIDv4();
        schemasMap.push({
            oldID: file.id,
            newID: null,
            oldUUID,
            newUUID,
            oldIRI: `#${oldUUID}`,
            newIRI: `#${newUUID}`,
            oldMessageID: file.messageId,
            newMessageID: null,
        })
        if (oldUUID) {
            uuidMap.set(oldUUID, newUUID);
        }
        file.uuid = newUUID;
        file.iri = '#' + newUUID;
        file.documentURL = null;
        file.contextURL = null;
        file.messageId = null;
        file.creator = owner;
        file.owner = owner;
        file.topicId = topicId || 'draft';
        file.status = SchemaStatus.DRAFT;
    }

    notifier.info(`Found ${files.length} schemas`);
    for (const file of files) {
        if (file.document) {
            file.document = replaceValueRecursive(file.document, uuidMap);
        }
        if (file.context) {
            file.context = replaceValueRecursive(file.context, uuidMap);
        }
        file.sourceVersion = file.version;
        SchemaHelper.setVersion(file, '', '');
    }

    const tools = await DatabaseServer.getTools({ status: ModuleStatus.PUBLISHED }, { fields: ['topicId'] });
    const toolSchemas = await DatabaseServer.getSchemas({ topicId: { $in: tools.map(t => t.topicId) } });
    const updatedSchemasMap = {
        '#GeoJSON': geoJson
    };
    const parsedSchemas: Schema[] = [];
    for (const item of files) {
        parsedSchemas.push(new Schema(item, true));
    }
    for (const item of toolSchemas) {
        parsedSchemas.push(new Schema(item, true));
    }

    const errors: any[] = [];
    for (const file of files) {
        const valid = fixSchemaDefsOnImport(file.iri, parsedSchemas, updatedSchemasMap);
        if (!valid) {
            errors.push({
                type: 'schema',
                uuid: file.uuid,
                name: file.name,
                error: 'invalid defs'
            });
        }
    }

    for (let index = 0; index < files.length; index++) {
        const schema = files[index];
        const parsedSchema = updatedSchemasMap[schema.iri];
        schema.document = parsedSchema.document;
        const file = SchemaConverterUtils.SchemaConverter(schema);
        file.category = category;
        file.readonly = false;
        file.system = false;
        const item = await createSchema(file, owner, emptyNotifier());
        schemasMap[index].newID = item.id.toString();
        notifier.info(`Schema ${index + 1} (${file.name || '-'}) created`);
    }

    notifier.completed();
    return { schemasMap, errors };
}

/**
 * Import schemas by messages
 * @param owner
 * @param messageIds
 * @param topicId
 * @param notifier
 */
export async function importSchemasByMessages(
    category: SchemaCategory,
    owner: string,
    messageIds: string[],
    topicId: string,
    notifier: INotifier
): Promise<ImportResult> {
    notifier.start('Load schema files');
    const schemas: ISchema[] = [];

    const relationships = new Set<string>();
    for (const messageId of messageIds) {
        const newSchema = await loadSchema(messageId);
        schemas.push(newSchema);
        for (const id of newSchema.relationships) {
            relationships.add(id);
        }
    }
    for (const messageId of messageIds) {
        relationships.delete(messageId);
    }
    for (const messageId of relationships) {
        const newSchema = await loadSchema(messageId);
        schemas.push(newSchema);
    }

    notifier.start('Load tags');
    const topics = new Set<string>();
    for (const schema of schemas) {
        topics.add(schema.topicId);
    }

    const tags: any[] = [];
    const messageServer = new MessageServer(null, null);
    for (const id of topics) {
        const tagMessages = await messageServer.getMessages<TagMessage>(
            id,
            MessageType.Tag,
            MessageAction.PublishTag
        );
        for (const tag of tagMessages) {
            tags.push({
                uuid: tag.uuid,
                name: tag.name,
                description: tag.description,
                owner: tag.owner,
                entity: tag.entity,
                target: tag.target,
                status: 'History',
                topicId: tag.topicId,
                messageId: tag.id,
                document: null,
                uri: null,
                date: tag.date,
                id: null
            });
        }
    }

    notifier.completed();

    let result = await importSchemaByFiles(
        category,
        owner,
        schemas,
        topicId,
        notifier
    );
    result = await importTagsByFiles(result, tags, notifier);

    return result;
}

/**
 * Prepare schema for preview
 * @param messageIds
 * @param notifier
 */
export async function prepareSchemaPreview(
    messageIds: string[],
    notifier: INotifier
): Promise<any[]> {
    notifier.start('Load schema file');
    const schemas = [];
    for (const messageId of messageIds) {
        const schema = await loadSchema(messageId);
        schemas.push(schema);
    }

    notifier.completedAndStart('Parse schema');
    const messageServer = new MessageServer(null, null);
    const uniqueTopics = schemas.map(res => res.topicId).filter(onlyUnique);
    const anotherSchemas: SchemaMessage[] = [];
    for (const topicId of uniqueTopics) {
        const anotherVersions = await messageServer.getMessages<SchemaMessage>(
            topicId,
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
