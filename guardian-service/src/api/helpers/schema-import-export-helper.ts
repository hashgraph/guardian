import {
    ISchema, SchemaEntity,
    SchemaStatus, SchemaHelper,
    ModelHelper,
    GenerateUUIDv4,
    Schema,
    SchemaCategory
} from '@guardian/interfaces';
import {
    MessageAction,
    MessageServer,
    MessageType,
    SchemaMessage, UrlType
} from '@hedera-modules';
import { replaceValueRecursive } from '@helpers/utils';
import {
    Logger
} from '@guardian/common';
import { emptyNotifier, INotifier } from '@helpers/notifier';
import { SchemaConverterUtils } from '@helpers/schema-converter-utils';
import { importTag } from './../tag.service';
import {
    createSchema,
    fixSchemaDefsOnImport, 
    ImportResult, 
    onlyUnique
} from './schema-helper';

export const schemaCache = {};

/**
 * Load schema
 * @param messageId
 * @param owner
 */
export async function loadSchema(messageId: string, owner: string) {
    const log = new Logger();
    try {
        if (schemaCache[messageId]) {
            return schemaCache[messageId];
        }
        const messageServer = new MessageServer(null, null);
        log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
        const message = await messageServer.getMessage<SchemaMessage>(messageId, MessageType.Schema);
        log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE']);
        const schemaToImport: any = {
            uuid: message.uuid,
            hash: '',
            name: message.name,
            description: message.description,
            entity: message.entity as SchemaEntity,
            status: SchemaStatus.PUBLISHED,
            readonly: false,
            system: false,
            active: false,
            document: message.getDocument(),
            context: message.getContext(),
            version: message.version,
            creator: message.owner,
            owner,
            topicId: message.getTopicId(),
            messageId,
            documentURL: message.getDocumentUrl(UrlType.url),
            contextURL: message.getContextUrl(UrlType.url),
            iri: null,
            codeVersion: message.codeVersion
        }
        SchemaHelper.updateIRI(schemaToImport);
        log.info(`loadSchema end: ${messageId}`, ['GUARDIAN_SERVICE']);
        schemaCache[messageId] = { ...schemaToImport };
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
    files: any[],
    notifier: INotifier
): Promise<ImportResult> {
    const { schemasMap } = result;
    const idMap: Map<string, string> = new Map();
    for (const item of schemasMap) {
        idMap.set(item.oldID, item.newID);
    }
    await importTag(files, idMap);
    return result;
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
): Promise<ImportResult> {
    notifier.start('Import schemas');

    const schemasMap: any[] = [];
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
            newIRI: `#${newUUID}`
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

    for (let index = 0; index < files.length; index++) {
        const schema = files[index];
        const parsedSchema = updatedSchemasMap[schema.iri];
        schema.document = parsedSchema.document;
        const file = SchemaConverterUtils.SchemaConverter(schema);
        file.category = SchemaCategory.POLICY;
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
    owner: string,
    messageIds: string[],
    topicId: string,
    notifier: INotifier
): Promise<ImportResult> {
    notifier.start('Load schema files');
    const schemas: ISchema[] = [];
    for (const messageId of messageIds) {
        const newSchema = await loadSchema(messageId, null);
        schemas.push(newSchema);
    }

    notifier.start('Load tags');
    const tags: any[] = [];

    notifier.completed();

    let result = await importSchemaByFiles(owner, schemas, topicId, notifier);
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
        const schema = await loadSchema(messageId, null);
        schemas.push(schema);
    }

    notifier.completedAndStart('Parse schema');
    const messageServer = new MessageServer(null, null);
    const uniqueTopics = schemas.map(res => res.topicId).filter(onlyUnique);
    const anotherSchemas: SchemaMessage[] = [];
    for (const topicId of uniqueTopics) {
        const anotherVersions = await messageServer.getMessages<SchemaMessage>(
            topicId, MessageType.Schema, MessageAction.PublishSchema
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
            if (topicMessage.version &&
                ModelHelper.versionCompare(topicMessage.version, schema.version) === 1) {
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