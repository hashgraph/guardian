import { ApiResponse } from '../api/helpers/api-response.js';
import { emptyNotifier, initNotifier } from '../helpers/notifier.js';
import { Controller } from '@nestjs/common';
import { BinaryMessageResponse, DatabaseServer, GenerateBlocks, JsonToXlsx, Logger, MessageError, MessageResponse, RunFunctionAsync, Users, XlsxToJson } from '@guardian/common';
import { ISchema, MessageAPI, ModuleStatus, Schema, SchemaCategory, SchemaHelper, SchemaNode, SchemaStatus, TopicType } from '@guardian/interfaces';
import {
    checkForCircularDependency,
    copySchemaAsync,
    createSchemaAndArtifacts,
    deleteSchema,
    exportSchemas,
    findAndPublishSchema,
    getPageOptions,
    getSchemaCategory,
    getSchemaTarget,
    importSchemaByFiles,
    importSchemasByMessages,
    importSubTools,
    importTagsByFiles,
    incrementSchemaVersion,
    prepareSchemaPreview,
    previewToolByMessage,
    updateSchemaDefs,
    updateToolConfig
} from './helpers/index.js';
import { PolicyImportExportHelper } from '../policy-engine/helpers/policy-import-export-helper.js';
import { readFile } from 'fs/promises';
import path from 'path';
import process from 'process';

@Controller()
export class SchemaService { }

/**
 * Connect to the message broker methods of working with schemas.
 */
export async function schemaAPI(): Promise<void> {
    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.CREATE_SCHEMA, async (msg) => {
        try {
            await createSchemaAndArtifacts(msg.category, msg, msg.owner, emptyNotifier());
            const schemas = await DatabaseServer.getSchemas(null, { limit: 100 });
            return new MessageResponse(schemas);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.CREATE_SCHEMA_ASYNC, async (msg) => {
        const { item, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            const schema = await createSchemaAndArtifacts(item.category, item, item.owner, notifier);
            notifier.result(schema.id);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    ApiResponse(MessageAPI.COPY_SCHEMA_ASYNC, async (msg) => {
        const { iri, topicId, name, owner, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            const schema = await copySchemaAsync(iri, topicId, name, owner);
            notifier.result(schema.iri);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    /**
     * Update schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.UPDATE_SCHEMA, async (msg) => {
        try {
            const id = msg.id as string;
            const item = await DatabaseServer.getSchema(id);
            if (item) {
                if (checkForCircularDependency(item)) {
                    throw new Error(`There is circular dependency in schema: ${item.iri}`);
                }
                item.name = msg.name;
                // item.topicId = msg.topicId;
                item.description = msg.description;
                item.entity = msg.entity;
                item.document = msg.document;
                item.status = SchemaStatus.DRAFT;
                item.errors = [];
                SchemaHelper.setVersion(item, null, item.version);
                SchemaHelper.updateIRI(item);
                await DatabaseServer.updateSchema(item.id, item);
                await updateSchemaDefs(item.iri);
            }
            const schemas = await DatabaseServer.getSchemas(null, { limit: 100 });
            return new MessageResponse(schemas);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }
            if (msg.id) {
                const schema = await DatabaseServer.getSchema(msg.id);
                return new MessageResponse(schema);
            }
            if (msg.type) {
                const iri = `#${msg.type}`;
                const schema = await DatabaseServer.getSchema({ iri });
                return new MessageResponse(schema);
            }
            return new MessageError('Invalid load schema parameter');
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return parent schemas
     *
     * @param {Object} [msg] - payload
     *
     * @returns {ISchema[]} - Parent schemas
     */
    ApiResponse(MessageAPI.GET_SCHEMA_PARENTS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }

            const { id, owner } = msg;
            if (!id) {
                return new MessageError('Invalid schema id');
            }
            if (!owner) {
                return new MessageError('Invalid schema owner');
            }

            const schema = await DatabaseServer.getSchema({
                id,
                owner
            });
            if (!schema) {
                return new MessageError('Schema is not found');
            }

            return new MessageResponse(await DatabaseServer.getSchemas({
                defs: schema.iri,
                owner
            }, {
                fields: [
                    'name',
                    'version',
                    'sourceVersion',
                    'status'
                ]
            }));
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schema tree
     *
     * @param {Object} [msg] - payload
     *
     * @returns {any} - Schema tree
     */
    ApiResponse(MessageAPI.GET_SCHEMA_TREE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }

            const { id, owner } = msg;
            if (!id) {
                return new MessageError('Invalid schema id');
            }
            if (!owner) {
                return new MessageError('Invalid schema owner');
            }

            const schema = await DatabaseServer.getSchemaById(id);
            if (!schema) {
                return new MessageError('Schema is not found');
            }

            // tslint:disable-next-line:no-shadowed-variable
            const getChildrenTypes = (schema: any) => {
                return (new Schema(schema)).fields.filter(field => field.isRef && field.type !== '#GeoJSON' && field.type !== '#SentinelHUB').map(field => field.type);
            }
            // tslint:disable-next-line:no-shadowed-variable
            const createNode = async (schema: any) => {
                const nestedSchemas = getChildrenTypes(schema);
                const node: SchemaNode = {
                    name: schema.name,
                    type: schema.iri,
                    children: await getNestedSchemas(nestedSchemas)
                };
                return node;
            }
            const getNestedSchemas = async (types: string[]) => {
                const result = [];
                if (!Array.isArray(types)) {
                    return result;
                }
                for (const type of types) {
                    // tslint:disable-next-line:no-shadowed-variable
                    const schema = await DatabaseServer.getSchema({
                        iri: type
                    });
                    if (result.findIndex(item => item.type === schema.iri) === -1) {
                        result.push(await createNode(schema));
                    }
                }
                return result;
            }
            return new MessageResponse(await createNode(schema));
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SCHEMAS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }
            const otherOptions: any = getPageOptions(msg);
            const filter: any = {
                readonly: false,
                system: false
            }
            if (msg.owner) {
                filter.owner = msg.owner;
            }
            if (Array.isArray(msg.category)) {
                filter.category = { $in: msg.category };
            } else if (typeof msg.category === 'string') {
                filter.category = msg.category;
            }
            if (msg.policyId) {
                filter.category = SchemaCategory.POLICY;
                const userPolicy = await DatabaseServer.getPolicyCache({
                    id: msg.policyId,
                    userId: msg.owner
                });
                if (userPolicy) {
                    filter.cacheCollection = 'schemas';
                    filter.cachePolicyId = msg.policyId;
                    // tslint:disable-next-line:no-shadowed-variable
                    const [items, count] =
                        await DatabaseServer.getAndCountPolicyCacheData(
                            filter,
                            otherOptions
                        );
                    return new MessageResponse({ items, count });
                }
                const policy = await DatabaseServer.getPolicyById(msg.policyId);
                filter.topicId = policy?.topicId;
            } else if (msg.moduleId) {
                filter.category = SchemaCategory.MODULE;
                const module = await DatabaseServer.getModuleById(msg.moduleId);
                filter.topicId = module?.topicId;
            } else if (msg.toolId) {
                filter.category = SchemaCategory.TOOL;
                const tool = await DatabaseServer.getToolById(msg.toolId);
                filter.topicId = tool?.topicId;
                if (tool && tool.status === ModuleStatus.PUBLISHED) {
                    delete filter.owner;
                }
            }
            if (msg.topicId) {
                filter.topicId = msg.topicId;
                if (filter.category === SchemaCategory.TOOL) {
                    const tool = await DatabaseServer.getTool({ topicId: msg.topicId });
                    if (tool && tool.status === ModuleStatus.PUBLISHED) {
                        delete filter.owner;
                    }
                }
            } else {
                if (filter.category === SchemaCategory.TOOL) {
                    const tools = await DatabaseServer.getTools({
                        $or: [{
                            owner: msg.owner
                        }, {
                            status: ModuleStatus.PUBLISHED
                        }]
                    }, {
                        fields: ['topicId']
                    });
                    const ids = tools.map(t => t.topicId);
                    delete filter.owner;
                    filter.topicId = { $in: ids }
                }
            }
            const [items, count] = await DatabaseServer.getSchemasAndCount(filter, otherOptions);
            return new MessageResponse({ items, count });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SCHEMAS_BY_UUID, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }
            const items = await DatabaseServer.getSchemas({
                uuid: msg.uuid,
                readonly: false,
                system: false
            });
            return new MessageResponse(items);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {any[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SUB_SCHEMAS, async (msg) => {
        try {
            const { topicId, owner, category } = msg;
            if (!owner) {
                return new MessageError('Invalid schema owner');
            }

            const topicMaps = new Set<string>();
            const nameMaps = new Map<string, string>();
            if (topicId) {
                topicMaps.add(topicId);
                nameMaps.set(topicId, 'Current');
            }

            let parents: any[];
            const options = {
                fields: [
                    'name',
                    'topicId',
                    'tools'
                ]
            };
            if (category === SchemaCategory.POLICY) {
                parents = await DatabaseServer.getPolicies({ owner, topicId }, options);
            } else if (category === SchemaCategory.TOOL) {
                parents = await DatabaseServer.getTools({ owner, topicId }, options);
            }
            if (Array.isArray(parents)) {
                for (const parent of parents) {
                    if (Array.isArray(parent.tools)) {
                        for (const tool of parent.tools) {
                            if (tool.topicId) {
                                topicMaps.add(tool.topicId);
                                nameMaps.set(tool.topicId, tool.name);
                            }
                        }
                    }
                }
            }
            const topicIds = Array.from(topicMaps.values());
            const schemas = await DatabaseServer.getSchemas({
                $or: [{
                    owner,
                    system: false,
                    readonly: false,
                    topicId
                }, {
                    system: false,
                    readonly: false,
                    topicId: { $in: topicIds },
                    category: SchemaCategory.TOOL,
                    status: SchemaStatus.PUBLISHED
                }]
            });
            for (const schema of schemas) {
                (schema as any).__component = nameMaps.get(schema.topicId);
            }
            return new MessageResponse(schemas);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Change the status of a schema on PUBLISHED.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.PUBLISH_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid id');
            }
            const { id, version, owner } = msg;
            const users = new Users();
            const root = await users.getHederaAccount(owner);
            const item = await findAndPublishSchema(id, version, owner, root, emptyNotifier());
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.PUBLISH_SCHEMA_ASYNC, async (msg) => {
        const { id, version, owner, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!msg) {
                notifier.error('Invalid id');
            }

            notifier.completedAndStart('Resolve Hedera account');
            const users = new Users();
            const root = await users.getHederaAccount(owner);
            const item = await findAndPublishSchema(id, version, owner, root, notifier);
            notifier.result(item.id);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse<any>(MessageAPI.DELETE_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid delete schema parameter');
            }

            const { id, owner, needResult } = msg;
            if (!id) {
                return new MessageError('Invalid schema id');
            }
            if (!owner) {
                return new MessageError('Invalid schema owner');
            }

            const schema = await DatabaseServer.getSchema({
                id, owner
            });
            if (!schema) {
                return new MessageError('Schema is not found');
            }

            const parents = await DatabaseServer.getSchemas({
                defs: schema.iri,
                owner
            }, {
                fields: [
                    'name',
                    'version',
                    'sourceVersion',
                    'status'
                ]
            });
            if (parents.length > 0) {
                return new MessageError(
                    `There are some schemas that depend on this schema:\r\n${parents.map((parent) =>
                        SchemaHelper.getSchemaName(
                            parent.name,
                            parent.version || parent.sourceVersion,
                            parent.status
                        )
                    ).join('\r\n')}`
                );
            }

            await deleteSchema(id, emptyNotifier());

            if (needResult) {
                const schemas = await DatabaseServer.getSchemas(null, { limit: 100 });
                return new MessageResponse(schemas);
            } else {
                return new MessageResponse(true);
            }
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Load schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, messageIds, topicId } = msg;
            if (!owner || !messageIds) {
                return new MessageError('Invalid import schema parameter');
            }

            const category = await getSchemaCategory(topicId);
            const schemasMap = await importSchemasByMessages(
                category, owner, messageIds, topicId, emptyNotifier()
            );
            return new MessageResponse(schemasMap);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.IMPORT_SCHEMAS_BY_MESSAGES_ASYNC, async (msg) => {
        const { owner, messageIds, topicId, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!msg) {
                notifier.error('Invalid import schema parameter');
            }
            if (!owner || !messageIds) {
                notifier.error('Invalid import schema parameter');
            }

            const category = await getSchemaCategory(topicId);
            const schemasMap = await importSchemasByMessages(
                category, owner, messageIds, topicId, notifier
            );
            notifier.result(schemasMap);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    /**
     * Load schema by files
     *
     * @param {string} [payload.files] files
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(MessageAPI.IMPORT_SCHEMAS_BY_FILE, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid import schema parameter');
            }
            const { owner, files, topicId } = msg;
            if (!owner || !files) {
                return new MessageError('Invalid import schema parameter');
            }
            const { schemas, tags } = files;
            const notifier = emptyNotifier();

            const category = await getSchemaCategory(topicId);
            let result = await importSchemaByFiles(
                category,
                owner,
                schemas,
                topicId,
                notifier
            );
            result = await importTagsByFiles(result, tags, notifier);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.IMPORT_SCHEMAS_BY_FILE_ASYNC, async (msg) => {
        const { owner, files, topicId, task } = msg;
        const { schemas, tags } = files;

        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!msg) {
                notifier.error('Invalid import schema parameter');
            }
            if (!owner || !files) {
                notifier.error('Invalid import schema parameter');
            }

            const category = await getSchemaCategory(topicId);
            let result = await importSchemaByFiles(
                category,
                owner,
                schemas,
                topicId,
                notifier
            );
            result = await importTagsByFiles(result, tags, notifier);

            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    /**
     * Preview schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(MessageAPI.PREVIEW_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid preview schema parameters');
            }
            const { messageIds } = msg as {
                /**
                 * Message ids
                 */
                messageIds: string[];
            };
            if (!messageIds) {
                return new MessageError('Invalid preview schema parameters');
            }

            const result = await prepareSchemaPreview(messageIds, emptyNotifier());
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            console.error(error);
            return new MessageError(error);
        }
    });

    /**
     * Async preview schema by message identifier
     *
     * @param {string} [payload.messageId] Message identifier
     *
     * @returns {Schema} Found or uploaded schema
     */
    ApiResponse(MessageAPI.PREVIEW_SCHEMA_ASYNC, async (msg) => {
        const { messageIds, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            if (!msg) {
                notifier.error('Invalid preview schema parameters');
                return;
            }
            if (!messageIds) {
                notifier.error('Invalid preview schema parameters');
                return;
            }

            const result = await prepareSchemaPreview(messageIds, notifier);
            notifier.result(result);
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });

        return new MessageResponse(task);
    });

    /**
     * Export schemas
     *
     * @param {Object} payload - filters
     * @param {string[]} payload.ids - schema ids
     *
     * @returns {any} - Response result
     */
    ApiResponse(MessageAPI.EXPORT_SCHEMAS, async (msg) => {
        try {
            return new MessageResponse(await exportSchemas(msg));
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.INCREMENT_SCHEMA_VERSION, async (msg) => {
        try {
            const { owner, iri } = msg as {
                /**
                 * Owner
                 */
                owner: string,
                /**
                 * IRI
                 */
                iri: string
            };
            const schema = await incrementSchemaVersion(iri, owner);
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Create schema
     *
     * @param {ISchema} payload - schema
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.CREATE_SYSTEM_SCHEMA, async (msg) => {
        try {
            const schemaObject = msg as ISchema;
            if (schemaObject.uuid) {
                schemaObject.contextURL = `schema:${schemaObject.uuid}`;
            }
            SchemaHelper.setVersion(schemaObject, null, null);
            SchemaHelper.updateIRI(schemaObject);
            schemaObject.status = SchemaStatus.DRAFT;
            schemaObject.topicId = null;
            schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;
            schemaObject.system = true;
            schemaObject.active = false;
            schemaObject.category = SchemaCategory.SYSTEM;
            schemaObject.readonly = false;
            const item = await DatabaseServer.createAndSaveSchema(schemaObject);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SYSTEM_SCHEMAS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }

            const { pageIndex, pageSize } = msg;
            const filter: any = {
                where: {
                    system: true
                }
            }
            const otherOptions: any = {};
            const _pageSize = parseInt(pageSize, 10);
            const _pageIndex = parseInt(pageIndex, 10);
            if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = _pageSize;
                otherOptions.offset = _pageIndex * _pageSize;
            } else {
                otherOptions.orderBy = { createDate: 'DESC' };
                otherOptions.limit = 100;
            }
            const [items, count] = await DatabaseServer.getSchemasAndCount(filter, otherOptions);
            return new MessageResponse({
                items,
                count
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Delete a schema.
     *
     * @param {Object} payload - filters
     * @param {string} payload.id - schema id
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.ACTIVE_SCHEMA, async (msg) => {
        try {
            if (msg && msg.id) {
                const item = await DatabaseServer.getSchema(msg.id);
                if (item) {
                    const schemas = await DatabaseServer.getSchemas({
                        entity: item.entity
                    });
                    for (const schema of schemas) {
                        schema.active = schema.id.toString() === item.id.toString();
                    }
                    await DatabaseServer.saveSchemas(schemas);
                }
            }
            return new MessageResponse(null);
        } catch (error) {
            return new MessageError(error);
        }
    });

    /**
     * Return schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_SYSTEM_SCHEMA, async (msg) => {
        try {
            if (!msg || !msg.entity) {
                return new MessageError('Invalid load schema parameter');
            }
            const schema = await DatabaseServer.getSchema({
                entity: msg.entity,
                system: true,
                active: true
            });
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {any[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_LIST_SCHEMAS, async (msg) => {
        try {
            if (!msg || !msg.owner) {
                return new MessageError('Invalid schema owner');
            }
            const schema = await DatabaseServer.getSchemas({
                where: {
                    owner: msg.owner,
                    system: false,
                    readonly: false,
                    category: { $ne: SchemaCategory.TAG }
                }
            }, {
                fields: [
                    'id',
                    'name',
                    'description',
                    'topicId',
                    'version',
                    'sourceVersion',
                    'status',
                ]
            });
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_TAG_SCHEMAS, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid load schema parameter');
            }
            const filter: any = {
                system: false,
                category: SchemaCategory.TAG
            }
            if (msg.owner) {
                filter.owner = msg.owner;
            }
            const otherOptions: any = getPageOptions(msg);
            const [items, count] = await DatabaseServer.getSchemasAndCount(filter, otherOptions);
            return new MessageResponse({ items, count });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Create schema
     *
     * @param {Object} [payload] - schema
     *
     * @returns {ISchema} - schema
     */
    ApiResponse(MessageAPI.CREATE_TAG_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid schema');
            }
            const schemaObject = msg as ISchema;
            if (schemaObject.uuid) {
                schemaObject.contextURL = `schema:${schemaObject.uuid}`;
            }
            SchemaHelper.setVersion(schemaObject, null, null);
            SchemaHelper.updateIRI(schemaObject);
            schemaObject.status = SchemaStatus.DRAFT;
            schemaObject.iri = schemaObject.iri || `${schemaObject.uuid}`;
            schemaObject.category = SchemaCategory.TAG;
            schemaObject.readonly = false;
            schemaObject.system = false;
            const topic = await DatabaseServer.getTopicByType(schemaObject.owner, TopicType.UserTopic);
            schemaObject.topicId = topic.topicId;
            const item = await DatabaseServer.createAndSaveSchema(schemaObject);
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Publish Schema
     *
     * @param {Object} [payload] - filters
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.PUBLISH_TAG_SCHEMA, async (msg) => {
        try {
            if (!msg) {
                return new MessageError('Invalid id');
            }
            const { id, version, owner } = msg;
            const users = new Users();
            const root = await users.getHederaAccount(owner);
            const item = await findAndPublishSchema(id, version, owner, root, emptyNotifier());
            return new MessageResponse(item);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Return schemas
     *
     * @returns {ISchema[]} - all schemas
     */
    ApiResponse(MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, async (msg) => {
        try {
            const schema = await DatabaseServer.getSchemas({
                system: false,
                readonly: false,
                category: SchemaCategory.TAG,
                status: SchemaStatus.PUBLISHED
            }, {
                fields: [
                    'id',
                    'name',
                    'description',
                    'topicId',
                    'uuid',
                    'version',
                    'iri',
                    'documentFileId'
                ]
            });
            return new MessageResponse(schema);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Export schemas
     */
    ApiResponse(MessageAPI.SCHEMA_EXPORT_XLSX, async (msg) => {
        try {
            const { ids } = msg;
            const schemas = await exportSchemas(ids);
            const buffer = await JsonToXlsx.generate(schemas, [], []);
            return new BinaryMessageResponse(buffer);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Load schema by xlsx
     */
    ApiResponse(MessageAPI.SCHEMA_IMPORT_XLSX, async (msg) => {
        try {
            const { user, xlsx, topicId } = msg;
            const notifier = emptyNotifier();

            if (!xlsx) {
                throw new Error('file in body is empty');
            }
            const { category, target } = await getSchemaTarget(topicId);
            if (!target) {
                throw new Error('Unknown target');
            }

            const users = new Users();
            const owner = (await users.getUser(user.username))?.did;
            const root = await users.getHederaAccount(owner);

            const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data));
            const { tools, errors } = await importSubTools(root, xlsxResult.getToolIds(), notifier);
            for (const tool of tools) {
                const subSchemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
                xlsxResult.updateTool(tool, subSchemas);
            }
            xlsxResult.updateSchemas(false);
            xlsxResult.updatePolicy(target);
            xlsxResult.addErrors(errors);
            GenerateBlocks.generate(xlsxResult);

            const result = await importSchemaByFiles(
                category,
                owner,
                xlsxResult.schemas,
                topicId,
                notifier,
                true
            );

            if (category === SchemaCategory.TOOL) {
                await updateToolConfig(target);
                await DatabaseServer.updateTool(target);
            } else if (category === SchemaCategory.POLICY) {
                await PolicyImportExportHelper.updatePolicyComponents(target);
            }

            return new MessageResponse({
                schemas: xlsxResult.schemas,
                errors: result.errors
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Load schema by xlsx
     */
    ApiResponse(MessageAPI.SCHEMA_IMPORT_XLSX_ASYNC, async (msg) => {
        const { user, xlsx, topicId, task } = msg;
        const notifier = await initNotifier(task);
        RunFunctionAsync(async () => {
            const { category, target } = await getSchemaTarget(topicId);

            if (!xlsx) {
                throw new Error('file in body is empty');
            }
            if (!target) {
                throw new Error('Unknown target');
            }

            new Logger().info(`Import policy by xlsx`, ['GUARDIAN_SERVICE']);
            const users = new Users();
            const owner = (await users.getUser(user.username))?.did;
            const root = await users.getHederaAccount(owner);
            notifier.start('File parsing');

            const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data));
            const { tools, errors } = await importSubTools(root, xlsxResult.getToolIds(), notifier);
            for (const tool of tools) {
                const subSchemas = await DatabaseServer.getSchemas({ topicId: tool.topicId });
                xlsxResult.updateTool(tool, subSchemas);
            }
            xlsxResult.updateSchemas(false);
            xlsxResult.updatePolicy(target);
            xlsxResult.addErrors(errors);
            GenerateBlocks.generate(xlsxResult);
            const result = await importSchemaByFiles(
                category,
                owner,
                xlsxResult.schemas,
                topicId,
                notifier,
                true
            );

            if (category === SchemaCategory.TOOL) {
                await updateToolConfig(target);
                await DatabaseServer.updateTool(target);
            } else if (category === SchemaCategory.POLICY) {
                await PolicyImportExportHelper.updatePolicyComponents(target);
            }

            notifier.result({
                schemas: xlsxResult.schemas,
                errors: result.errors
            });
        }, async (error) => {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            notifier.error(error);
        });
        return new MessageResponse(task);
    });

    /**
     * Preview schema by xlsx
     */
    ApiResponse(MessageAPI.SCHEMA_IMPORT_XLSX_PREVIEW, async (msg) => {
        try {
            const { xlsx } = msg;
            if (!xlsx) {
                throw new Error('file in body is empty');
            }
            const xlsxResult = await XlsxToJson.parse(Buffer.from(xlsx.data));
            for (const toolId of xlsxResult.getToolIds()) {
                try {
                    const tool = await previewToolByMessage(toolId.messageId);
                    xlsxResult.updateTool(tool.tool, tool.schemas);
                } catch (error) {
                    xlsxResult.addErrors([{
                        text: `Failed to load tool (${toolId.messageId})`,
                        worksheet: toolId.worksheet,
                        message: error?.toString()
                    }]);
                }
            }
            xlsxResult.updateSchemas(false);
            GenerateBlocks.generate(xlsxResult);

            return new MessageResponse(xlsxResult.toJson());
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    /**
     * Preview schema by xlsx
     */
    ApiResponse(MessageAPI.GET_TEMPLATE, async (msg) => {
        try {
            const { filename } = msg;
            const filePath = path.join(process.cwd(), 'artifacts', filename);
            const file = await readFile(filePath);
            return new BinaryMessageResponse(file.buffer);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
