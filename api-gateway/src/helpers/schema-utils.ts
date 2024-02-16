import { IAuthUser } from '@guardian/common';
import { ISchema, SchemaCategory } from '@guardian/interfaces';

/**
 * API Schema Utils
 */
export class SchemaUtils {
    /**
     * Convert schemas to old format
     * @param {ISchema | ISchema[]} schemas
     * @returns {ISchema | ISchema[]}
     */
    public static toOld<T extends ISchema | ISchema[]>(schemas: T): T {
        if (schemas) {
            if (Array.isArray(schemas)) {
                for (const schema of schemas) {
                    if (schema.document) {
                        schema.document = JSON.stringify(schema.document);
                    }
                    if (schema.context) {
                        schema.context = JSON.stringify(schema.context);
                    }
                }
                return schemas;
            } else {
                const schema: any = schemas;
                if (schema.document) {
                    schema.document = JSON.stringify(schema.document);
                }
                if (schema.context) {
                    schema.context = JSON.stringify(schema.context);
                }
                return schema;
            }
        }
        return schemas;
    }

    /**
     * Convert schema from old format
     * @param {ISchema} schema
     * @returns {ISchema}
     */
    public static fromOld(schema: ISchema): ISchema {
        if (schema && typeof schema.document === 'string') {
            schema.document = JSON.parse(schema.document);
        }
        if (schema && typeof schema.context === 'string') {
            schema.context = JSON.parse(schema.context);
        }
        return schema;
    }

    /**
     * Check schema permission
     * @param {ISchema} schema
     * @param {IAuthUser} user
     * @param {SchemaCategory} type
     *
     * @returns {string} error
     */
    public static checkPermission(schema: ISchema, user: IAuthUser, type: SchemaCategory): string | null {
        if (!schema) {
            return 'Schema does not exist.';
        }
        if (schema.system) {
            if (schema.creator !== user.username) {
                return 'Invalid creator.';
            }
        } else {
            if (schema.creator !== user.did) {
                return 'Invalid creator.';
            }
        }
        if (type === SchemaCategory.TAG) {
            if (schema.system) {
                return 'Schema is system.';
            }
            if (schema.category !== SchemaCategory.TAG) {
                return 'Invalid schema category.';
            }
        } else if (type === SchemaCategory.SYSTEM) {
            if (!schema.system) {
                return 'Schema is not system.';
            }
            if (schema.category === SchemaCategory.POLICY ||
                schema.category === SchemaCategory.TAG) {
                return 'Invalid schema category.';
            }
        } else {
            if (schema.system) {
                return 'Schema is system.';
            }
            if (schema.category === SchemaCategory.SYSTEM ||
                schema.category === SchemaCategory.TAG) {
                return 'Invalid schema category.';
            }
        }
        return null;
    }
}
