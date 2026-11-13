import { IOwner, ISchema, SchemaCategory } from '@guardian/interfaces';
import { HttpException, HttpStatus } from '@nestjs/common';

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
     * Clear ids
     * @param {ISchema} schema
     * @returns {ISchema}
     */
    public static clearIds(schema: ISchema): ISchema {
        delete schema.version;
        delete schema.id;
        delete schema.status;
        delete schema.topicId;
        delete schema._id;
        return schema;
    }

    /**
     * Rejects a new schema with the SYSTEM category: a system schema is created only through
     * POST /schemas/system/:username, the generic routes would store a draft no system list shows.
     * @param {ISchema} schema
     */
    public static rejectSystemCategory(schema: ISchema): void {
        if (schema?.category === SchemaCategory.SYSTEM) {
            throw new HttpException(
                'System schemas are created through POST /schemas/system/:username.',
                HttpStatus.UNPROCESSABLE_ENTITY
            );
        }
    }

    /**
     * Check the permission to delete a schema through the generic routes. Besides the policy
     * schemas, they delete the SYSTEM-category drafts the schema editor stored before it used
     * the system schema routes: those are not system schemas, so the system routes refuse them.
     * @param {ISchema} schema
     * @param {IOwner} user
     *
     * @returns {string} error
     */
    public static checkDeletePermission(schema: ISchema, user: IOwner): string | null {
        if (schema && !schema.system && schema.category === SchemaCategory.SYSTEM) {
            return schema.owner === user.owner ? null : 'Invalid creator.';
        }
        return SchemaUtils.checkPermission(schema, user, SchemaCategory.POLICY);
    }

    /**
     * Check schema permission
     * @param {ISchema} schema
     * @param {IAuthUser} user
     * @param {SchemaCategory} type
     *
     * @returns {string} error
     */
    public static checkPermission(
        schema: ISchema,
        user: IOwner,
        type: SchemaCategory
    ): string | null {
        if (!schema) {
            return 'Schema does not exist.';
        }
        if (schema.system) {
            if (
                schema.creator !== user.username &&
                schema.creator !== user.creator
            ) {
                return 'Invalid creator.';
            }
        } else {
            if (schema.owner !== user.owner) {
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
