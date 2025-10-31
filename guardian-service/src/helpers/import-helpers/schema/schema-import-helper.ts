import { IOwner, ISchema, ISchemaDocument, Schema, SchemaCategory } from '@guardian/interfaces';
import { DatabaseServer, INotificationStep, PinoLogger, Schema as SchemaCollection } from '@guardian/common';
import { ImportSchemaResult } from './schema-import.interface.js';
import { SchemaImport } from './schema-import.js';
import { checkForCircularDependency } from '../common/load-helper.js';
import { ImportMode } from '../common/import.interface.js';

/**
 * Schema import export helper
 */
export class SchemaImportExportHelper {
    /**
     * Export schemas
     * @param ids Schemas ids
     * @returns Schemas to export
     */
    public static async exportSchemas(ids: string[]): Promise<SchemaCollection[]> {
        const schemas = await DatabaseServer.getSchemasByIds(ids);
        const map = new Map<string, SchemaCollection>();
        for (const schema of schemas) {
            map.set(schema.iri, schema);
        }

        const defs = new Set<string>();
        for (const schema of schemas) {
            const keys = SchemaImportExportHelper.getDefs(schema);
            for (const iri of keys) {
                if (!map.has(iri)) {
                    defs.add(iri);
                }
            }
        }

        const sub = await DatabaseServer.getSchemas({ iri: { $in: Array.from(defs) } });
        for (const schema of sub) {
            map.set(schema.iri, schema);
        }

        return Array.from(map.values());
    }

    /**
     * Get defs
     * @param schema
     */
    public static getDefs(schema: ISchema): string[] {
        try {
            let document: ISchemaDocument = schema.document;
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
     * Get defs
     * @param schema
     */
    public static getDefDocuments(schema: ISchema): ISchemaDocument[] {
        try {
            let document: ISchemaDocument = schema.document;
            if (typeof document === 'string') {
                document = JSON.parse(document);
            }
            if (document && document.$defs) {
                return Object.values(document.$defs);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Validate and update schema defs
     *
     * @param target Schema iri
     * @param allSchemas Schemas
     * @param validatedSchemas Schemas
     */
    public static validateDefs(
        target: string,
        allSchemas: Schema[],
        validatedSchemas: Map<string, Schema>
    ): string {
        if (validatedSchemas.has(target)) {
            return null;
        }

        const schema = allSchemas.find((s) => s.iri === target);
        if (!schema) {
            return 'Invalid defs';
        }

        if (checkForCircularDependency(schema)) {
            return `There is circular dependency in schema: ${target}`;
        }

        let valid = true;
        for (const field of schema.fields) {
            if (field.isRef) {
                const error = SchemaImportExportHelper.validateDefs(field.type, allSchemas, validatedSchemas);
                if (error) {
                    field.type = null;
                    valid = false;
                }
            }
        }
        schema.update(schema.fields, schema.conditions);
        schema.updateRefs(allSchemas);

        validatedSchemas.set(target, schema);

        if (!valid) {
            return 'Invalid defs';
        } else {
            return null;
        }
    }

    /**
     * Import schema by files
     * @param files
     * @param user
     * @param options
     * @param notifier
     */
    public static async importSchemaByFiles(
        files: ISchema[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            skipGenerateId?: boolean,
            outerSchemas?: { name: string, iri: string }[],
            mode?: ImportMode
        },
        notifier: INotificationStep,
        userId: string | null,
        schemasIds?: string[],
    ): Promise<ImportSchemaResult> {
        notifier.start();
        const helper = new SchemaImport(options.mode, notifier);
        helper.addExternalSchemas(options.outerSchemas);
        const result = await helper.import(files, user, options, userId, schemasIds);
        notifier.complete();
        return result;
    }
    /**
     * Import schemas by messages
     * @param owner
     * @param messageIds
     * @param topicId
     * @param notifier
     * @param logger
     */
    public static async importSchemasByMessages(
        messageIds: string[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            mode?: ImportMode
        },
        logger: PinoLogger,
        notifier: INotificationStep,
        userId: string | null,
        schemasIds?: string[],
    ): Promise<ImportSchemaResult> {
        notifier.start();
        const helper = new SchemaImport(options.mode, notifier);
        const result = await helper.importByMessage(messageIds, user, options, logger, userId, schemasIds);
        notifier.complete();
        return result;
    }

    /**
     * Import schema by files
     * @param files
     * @param user
     * @param options
     * @param notifier
     */
    public static async importSystemSchema(
        files: ISchema[],
        user: IOwner,
        options: {
            topicId: string,
            category: SchemaCategory,
            skipGenerateId?: boolean,
            outerSchemas?: { name: string, iri: string }[],
            mode?: ImportMode
        },
        step: INotificationStep,
        userId: string | null
    ): Promise<ImportSchemaResult> {
        const helper = new SchemaImport(options.mode, step);
        helper.addExternalSchemas(options.outerSchemas);
        return helper.importSystem(files, user, options, userId);
    }
}