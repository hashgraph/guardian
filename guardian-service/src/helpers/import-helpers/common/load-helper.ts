import { DatabaseServer, MessageServer, MessageType, PinoLogger, SchemaMessage, UrlType } from '@guardian/common';
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
export async function loadSchema(messageId: string, log: PinoLogger, userId: string | null): Promise<any> {
    try {
        let schemaToImport = SchemaCache.getSchema(messageId);
        if (!schemaToImport) {
            const messageServer = new MessageServer(null);
            log.info(`loadSchema: ${messageId}`, ['GUARDIAN_SERVICE'], userId);
            const message = await messageServer
                .getMessage<SchemaMessage>({
                    messageId,
                    loadIPFS: true,
                    type: MessageType.Schema,
                    userId,
                    interception: null
                });
            log.info(`loadedSchema: ${messageId}`, ['GUARDIAN_SERVICE'], userId);
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
        log.error(error, ['GUARDIAN_SERVICE'], userId);
        throw new Error(`Cannot load schema ${messageId}`);
    }
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