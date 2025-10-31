import { DatabaseServer, MessageAction, MessageServer, MessageType, PinoLogger, SchemaMessage, SchemaPackageMessage, UrlType } from '@guardian/common';
import { ISchema, SchemaCategory, SchemaEntity, SchemaHelper, SchemaStatus } from '@guardian/interfaces';

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
 * @param log
 */
export async function loadSchema(
    messageId: string,
    log: PinoLogger,
    userId: string | null
): Promise<ISchema | ISchema[] | null> {
    try {
        const result = SchemaCache.getSchema(messageId);
        if (result) {
            return result;
        }
        const messageServer = new MessageServer(null);
        log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE'], userId);
        const response = await messageServer
            .getMessage<SchemaMessage | SchemaPackageMessage>({
                messageId,
                loadIPFS: true,
                type: [MessageType.Schema, MessageType.SchemaPackage],
                userId,
                interception: null
            });

        log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE'], userId);
        if (response.type === MessageType.Schema) {
            const message = response as SchemaMessage;
            const schemaToImport: any = {
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
            SchemaHelper.updateIRI(schemaToImport);
            SchemaCache.setSchema(messageId, schemaToImport);
            return schemaToImport;
        } else if (response.type === MessageType.SchemaPackage) {
            const message = response as SchemaPackageMessage;
            const schemasToImport: any[] = [];
            const documents = message.getDocument();
            const contexts = message.getContext();
            const metadata = message.getMetadata();
            if (Array.isArray(metadata?.schemas)) {
                for (const schema of metadata.schemas) {
                    const document = documents[schema.id];
                    const context = contexts;
                    const schemaToImport: any = {
                        iri: null,
                        uuid: schema.uuid,
                        hash: '',
                        owner: null,
                        messageId,
                        name: schema.name,
                        description: schema.description,
                        entity: schema.entity as SchemaEntity,
                        version: schema.version,
                        creator: schema.owner,
                        topicId: message.getTopicId(),
                        codeVersion: schema.codeVersion,
                        relationships: metadata.relationships || [],
                        status: SchemaStatus.PUBLISHED,
                        readonly: false,
                        system: false,
                        active: false,
                        document,
                        context,
                        documentURL: message.getDocumentUrl(UrlType.url),
                        contextURL: message.getContextUrl(UrlType.url)
                    }
                    SchemaHelper.updateIRI(schemaToImport);
                    schemasToImport.push(schemaToImport);
                }
            }
            SchemaCache.setSchema(messageId, schemasToImport);
            return schemasToImport;
        } else {
            return null;
        }
    } catch (error) {
        log.error(error, ['GUARDIAN_SERVICE'], userId);
        throw new Error(`Cannot load schema ${messageId}`);
    }
}

export async function loadAnotherSchemas(
    uniqueTopics: string[],
    log: PinoLogger,
    userId: string | null
): Promise<{
    uuid: string,
    version: string,
    messageId: string
}[]> {
    const messageServer = new MessageServer(null);
    const anotherSchemas: (SchemaMessage | SchemaPackageMessage)[] = [];

    for (const topicId of uniqueTopics) {
        const messages = await messageServer.getMessages<SchemaMessage | SchemaPackageMessage>(
            topicId,
            userId,
            [MessageType.Schema, MessageType.SchemaPackage]
        );
        for (const message of messages) {
            if (
                message.action === MessageAction.PublishSchema ||
                message.action === MessageAction.PublishSchemas ||
                message.action === MessageAction.PublishSystemSchema ||
                message.action === MessageAction.PublishSystemSchemas
            ) {
                anotherSchemas.push(message);
            }
        }
    }

    const result: {
        uuid: string,
        version: string,
        messageId: string
    }[] = [];
    for (const anotherSchema of anotherSchemas) {
        if (anotherSchema.type === MessageType.Schema) {
            const message = (anotherSchema as SchemaMessage);
            result.push({
                uuid: message.uuid,
                version: message.version,
                messageId: message.getId(),
            })
        } else {
            const message = (await messageServer.loadDocument(anotherSchema)) as SchemaPackageMessage;
            const metadata = message.getMetadata();
            if (Array.isArray(metadata?.schemas)) {
                for (const schema of metadata.schemas) {
                    result.push({
                        uuid: schema.uuid,
                        version: schema.version,
                        messageId: message.getId(),
                    })
                }
            }
        }
    }
    return result;
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

export async function getSchemaCategory(topicId: string): Promise<SchemaCategory> {
    if (topicId) {
        const item = await DatabaseServer.getTool({ topicId });
        if (item) {
            return SchemaCategory.TOOL;
        }
    }
    return SchemaCategory.POLICY;
}

export async function getSchemaTarget(topicId: string): Promise<any> {
    if (topicId) {
        const tool = await DatabaseServer.getTool({ topicId });
        if (tool) {
            return { category: SchemaCategory.TOOL, target: tool };
        }
        const policy = await DatabaseServer.getPolicy({ topicId });
        if (policy) {
            return { category: SchemaCategory.POLICY, target: policy };
        }
    }
    return null;
}