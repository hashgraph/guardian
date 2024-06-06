import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    AnyResponse,
    IPage,
    DataBaseHelper,
    MessageCache,
    TopicCache,
    Message,
    TokenCache,
    NftCache,
} from '@indexer/common';
import escapeStringRegexp from 'escape-string-regexp';
import { Relationships } from '../utils/relationships.js';
import {
    MessageType,
    MessageAction,
    IPageFilters,
    IDetailsResults,
    IRelationshipsResults,
    ISchemaTreeResult,
} from '@indexer/interfaces';
import { parsePageParams } from '../utils/parse-page-params.js';
import axios from 'axios';
import { SchemaTreeNode } from '../utils/schema-tree.js';

const pageOptions = new Set([
    'pageSize',
    'pageIndex',
    'orderField',
    'orderDir',
    'keywords',
]);

function parsePageFilters(msg: IPageFilters) {
    let filters: any = {};
    const keys = Object.keys(msg).filter((name) => !pageOptions.has(name));
    for (const key of keys) {
        filters[key] = {
            $regex: `.*${escapeStringRegexp(msg[key]).trim()}.*`,
            $options: 'si',
        };
    }
    if (msg.keywords) {
        filters = Object.assign(filters, parseKeywordFilter(msg.keywords));
    }
    return filters;
}

function parseKeywordFilter(keywordsString: string) {
    let keywords;
    try {
        keywords = JSON.parse(keywordsString);
    } catch {
        return {};
    }
    const filter: any = {
        $and: [],
    };
    for (const keyword of keywords) {
        filter.$and.push({
            'analytics.textSearch': {
                $regex: `.*${escapeStringRegexp(keyword).trim()}.*`,
                $options: 'si',
            },
        });
    }
    return filter;
}

async function loadDocuments(row: Message): Promise<Message> {
    if (row?.files?.length) {
        row.documents = [];
        for (const fileName of row.files) {
            const file = await DataBaseHelper.loadFile(fileName);
            row.documents.push(file);
        }
    }
    return row;
}

@Controller()
export class EntityService {
    //#region ACCOUNTS
    //#region STANDARD REGISTRIES
    @MessagePattern(IndexerMessageAPI.GET_REGISTRIES)
    async getRegistries(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = Object.assign(
                parseKeywordFilter(msg.keywords),
                parsePageFilters(msg)
            );
            filters.type = MessageType.STANDARD_REGISTRY;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_REGISTRY)
    async getRegistry(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.STANDARD_REGISTRY,
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            const users = await em.count(Message, {
                type: MessageType.DID_DOCUMENT,
                topicId: item.options.registrantTopicId,
                'options.did': { $ne: item.options.did },
            } as any);

            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            const vps = await em.count(Message, {
                type: MessageType.VP_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            const policies = await em.count(Message, {
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
                'options.owner': item.options.did,
            } as any);

            const tools = await em.count(Message, {
                type: MessageType.TOOL,
                action: MessageAction.PublishTool,
                'options.owner': item.options.did,
            } as any);

            const modules = await em.count(Message, {
                type: MessageType.MODULE,
                action: MessageAction.PublishModule,
                'options.owner': item.options.did,
            } as any);

            const roles = await em.count(Message, {
                type: MessageType.ROLE_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            const tokens = await em.count(TokenCache, {
                treasury: item.owner,
            } as any);

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity: {
                    vcs,
                    vps,
                    policies,
                    roles,
                    tools,
                    modules,
                    tokens,
                    users,
                },
            });
        } catch (error) {
            return new MessageError(error);
        }
    }

    //#endregion
    //#region REGISTRY USERS
    @MessagePattern(IndexerMessageAPI.GET_REGISTRY_USERS)
    async getRegistryUsers(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.DID_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const registryOptions = await em.find(
                Message,
                {
                    type: MessageType.STANDARD_REGISTRY,
                },
                {
                    fields: ['options'],
                }
            );
            if (filters.$and) {
                filters.$and.push({
                    topicId: {
                        $in: registryOptions.map(
                            (reg) => reg.options.registrantTopicId
                        ),
                    },
                    'options.did': {
                        $nin: registryOptions.map((reg) => reg.options.did),
                    },
                });
            } else {
                filters.$and = [
                    {
                        topicId: {
                            $in: registryOptions.map(
                                (reg) => reg.options.registrantTopicId
                            ),
                        },
                        'options.did': {
                            $nin: registryOptions.map((reg) => reg.options.did),
                        },
                    },
                ];
            }
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_REGISTRY_USER)
    async getRegistryUser(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const registryOptions = await em.find(
                Message,
                {
                    type: MessageType.STANDARD_REGISTRY,
                },
                {
                    fields: ['options'],
                }
            );
            const item = await em.findOne(Message, {
                topicId: {
                    $in: registryOptions.map(
                        (reg) => reg.options.registrantTopicId
                    ),
                },
                'options.did': {
                    $nin: registryOptions.map((reg) => reg.options.did),
                },
                consensusTimestamp: messageId,
                type: MessageType.DID_DOCUMENT,
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);

            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            const vps = await em.count(Message, {
                type: MessageType.VP_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            const roles = await em.count(Message, {
                type: MessageType.ROLE_DOCUMENT,
                'options.issuer': item.options.did,
            } as any);

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity: {
                    vcs,
                    vps,
                    roles,
                },
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#endregion

    //#region METHODOLOGIES
    //#region POLICIES
    @MessagePattern(IndexerMessageAPI.GET_POLICIES)
    async getPolicies(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.INSTANCE_POLICY;
            filters.action = MessageAction.PublishPolicy;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_POLICY)
    async getPolicy(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });
            const schemas = await em.count(Message, {
                type: MessageType.SCHEMA,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
                topicId: row.topicId,
            } as any);
            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                'analytics.policyId': row.consensusTimestamp,
            } as any);
            const vps = await em.count(Message, {
                type: MessageType.VP_DOCUMENT,
                'analytics.policyId': row.consensusTimestamp,
            } as any);
            const roles = await em.count(Message, {
                type: MessageType.ROLE_DOCUMENT,
                'analytics.policyId': row.consensusTimestamp,
            } as any);
            const activity: any = {
                schemas,
                vcs,
                vps,
                roles,
            };
            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region TOOLS
    @MessagePattern(IndexerMessageAPI.GET_TOOLS)
    async getTools(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.TOOL;
            filters.action = MessageAction.PublishTool;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_TOOL)
    async getTool(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.TOOL,
                action: MessageAction.PublishTool,
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            const policies = await em.count(Message, {
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
                'analytics.tools': messageId,
            } as any);
            const schemas = await em.count(Message, {
                type: MessageType.SCHEMA,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
                topicId: row?.topicId,
            } as any);
            const activity: any = {
                policies,
                schemas,
            };

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region MODULES
    @MessagePattern(IndexerMessageAPI.GET_MODULES)
    async getModules(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.MODULE;
            filters.action = MessageAction.PublishModule;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_MODULE)
    async getModule(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.MODULE,
                action: MessageAction.PublishModule,
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region SCHEMAS
    @MessagePattern(IndexerMessageAPI.GET_SCHEMAS)
    async getSchemas(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.SCHEMA;
            filters.action = MessageAction.PublishSchema;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows.map((item) => {
                    delete item.analytics;
                    return item;
                }),
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_SCHEMA)
    async getSchema(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.SCHEMA,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                action: MessageAction.CreateVC,
                'analytics.schemaId': row.consensusTimestamp,
            } as any);
            const vps = await em.count(Message, {
                type: MessageType.VP_DOCUMENT,
                action: MessageAction.CreateVP,
                'analytics.schemaIds': row.consensusTimestamp,
            } as any);
            const activity: any = {
                vcs,
                vps,
            };

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            await loadDocuments(item);

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_SCHEMA_TREE)
    async getSchemaTree(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<ISchemaTreeResult>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
            });
            if (!item) {
                return new MessageResponse<ISchemaTreeResult>({
                    id: messageId,
                });
            }

            const root = new SchemaTreeNode(
                item.consensusTimestamp,
                item.options?.name,
                em
            );
            await root.loadChildren(item.analytics?.childSchemas || []);
            return new MessageResponse<ISchemaTreeResult>({
                id: messageId,
                item,
                root: root.toObject(),
            });
        } catch (error) {
            console.log(error);
            return new MessageError(error);
        }
    }
    //#endregion
    //#region TOKENS
    @MessagePattern(IndexerMessageAPI.GET_TOKENS)
    async getTokens(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<TokenCache>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                TokenCache,
                filters,
                options
            );
            const result: IPage<TokenCache> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_TOKEN)
    async getToken(
        @Payload() msg: { tokenId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { tokenId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const row = await em.findOne(TokenCache, {
                tokenId,
            });
            return new MessageResponse<IDetailsResults>({
                id: tokenId,
                row,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region ROLES
    @MessagePattern(IndexerMessageAPI.GET_ROLES)
    async getRoles(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.ROLE_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_ROLE)
    async getRole(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.ROLE_DOCUMENT,
            } as any);
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                action: MessageAction.CreateVC,
                'options.relationships': row.consensusTimestamp,
            } as any);
            const activity: any = {
                vcs,
            };

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            await loadDocuments(item);

            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
                activity,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#endregion

    //#region DOCUMENTS
    //#region DIDS
    @MessagePattern(IndexerMessageAPI.GET_DID_DOCUMENTS)
    async getDidDocuments(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.DID_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_DID_DOCUMENT)
    async getDidDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.DID_DOCUMENT,
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);
            const history = await em.find(
                Message,
                {
                    uuid: item.uuid,
                    type: MessageType.VP_DOCUMENT,
                },
                {
                    orderBy: {
                        consensusTimestamp: 'ASC',
                    },
                }
            );
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                history,
                row,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_DID_RELATIONSHIPS)
    async getDidRelationships(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IRelationshipsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.DID_DOCUMENT,
            });
            if (!item) {
                return new MessageResponse<IRelationshipsResults>({
                    id: messageId,
                });
            }

            const utils = new Relationships(item);
            const { target, relationships, links } = await utils.load();

            return new MessageResponse<IRelationshipsResults>({
                id: messageId,
                item,
                target,
                relationships,
                links,
            });
        } catch (error) {
            console.log(error);
            return new MessageError(error);
        }
    }
    //#endregion
    //#region VPS
    @MessagePattern(IndexerMessageAPI.GET_VP_DOCUMENTS)
    async getVpDocuments(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VP_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows.map((item) => {
                    delete item.analytics;
                    return item;
                }),
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VP_DOCUMENT)
    async getVpDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VP_DOCUMENT,
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);
            const history = await em.find(
                Message,
                {
                    uuid: item.uuid,
                    type: MessageType.VP_DOCUMENT,
                },
                {
                    orderBy: {
                        consensusTimestamp: 'ASC',
                    },
                }
            );
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                history,
                row,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VP_RELATIONSHIPS)
    async getVpRelationships(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IRelationshipsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VP_DOCUMENT,
            });
            if (!item) {
                return new MessageResponse<IRelationshipsResults>({
                    id: messageId,
                });
            }

            const utils = new Relationships(item);
            const { target, relationships, links, categories } =
                await utils.load();

            return new MessageResponse<IRelationshipsResults>({
                id: messageId,
                item,
                target,
                relationships,
                links,
                categories,
            });
        } catch (error) {
            console.log(error);
            return new MessageError(error);
        }
    }
    //#endregion
    //#region VCS
    @MessagePattern(IndexerMessageAPI.GET_VC_DOCUMENTS)
    async getVcDocuments(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VC_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows.map((item) => {
                    if (item.analytics) {
                        item.analytics = Object.assign(item.analytics, {
                            schemaName: item.analytics.schemaName,
                        });
                    }
                    return item;
                }),
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VC_DOCUMENT)
    async getVcDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VC_DOCUMENT,
            });
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);
            let schema;
            const document = item.documents[0];
            if (document && item.analytics?.schemaId) {
                const schemaMessage = await em.findOne(Message, {
                    type: MessageType.SCHEMA,
                    consensusTimestamp: item.analytics.schemaId,
                });
                const schemaFileString = await DataBaseHelper.loadFile(
                    schemaMessage.files[0]
                );
                if (schemaFileString) {
                    schema = JSON.parse(schemaFileString);
                }
            }
            const history = await em.find(
                Message,
                {
                    uuid: item.uuid,
                    type: MessageType.VC_DOCUMENT,
                },
                {
                    orderBy: {
                        consensusTimestamp: 'ASC',
                    },
                }
            );
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                history,
                row,
                schema,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VC_RELATIONSHIPS)
    async getVcRelationships(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IRelationshipsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VC_DOCUMENT,
            });
            if (!item) {
                return new MessageResponse<IRelationshipsResults>({
                    id: messageId,
                });
            }

            const utils = new Relationships(item);
            const { target, relationships, links, categories } =
                await utils.load();

            return new MessageResponse<IRelationshipsResults>({
                id: messageId,
                item,
                target,
                relationships,
                links,
                categories,
            });
        } catch (error) {
            console.log(error);
            return new MessageError(error);
        }
    }
    //#endregion
    //#endregion

    //#region OTHERS
    //#region NFTS
    @MessagePattern(IndexerMessageAPI.GET_NFTS)
    async getNFTs(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<NftCache>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                NftCache,
                filters,
                options
            );
            const result: IPage<NftCache> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_NFT)
    async getNFT(
        @Payload() msg: { tokenId: string; serialNumber: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { tokenId } = msg;
            const serialNumber = parseInt(msg.serialNumber, 10);
            const em = DataBaseHelper.getEntityManager();
            const row = await em.findOne(NftCache, {
                tokenId,
                serialNumber,
            });
            const nftHistory: any = await axios.get(
                `https://${process.env.HEDERA_NET}.mirrornode.hedera.com/api/v1/tokens/${tokenId}/nfts/${serialNumber}/transactions?limit=100`
            );
            console.log(nftHistory);
            return new MessageResponse<IDetailsResults>({
                id: tokenId,
                row,
                history: nftHistory.data?.transactions || [],
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region TOPICS
    @MessagePattern(IndexerMessageAPI.GET_TOPICS)
    async getTopics(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.TOPIC;
            filters.action = MessageAction.CreateTopic;
            filters['options.childId'] = null;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_TOPIC)
    async getTopic(
        @Payload() msg: { topicId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { topicId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                type: MessageType.TOPIC,
                action: MessageAction.CreateTopic,
                'options.childId': null,
                topicId,
            } as any);
            const row = await em.findOne(TopicCache, {
                topicId,
            });

            const registries = await em.count(Message, {
                type: MessageType.STANDARD_REGISTRY,
                topicId,
            });
            const topics = await em.count(Message, {
                type: MessageType.TOPIC,
                action: MessageAction.CreateTopic,
                'options.parentId': topicId,
            } as any);
            const policies = await em.count(Message, {
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
                topicId,
            } as any);
            const tools = await em.count(Message, {
                type: MessageType.TOOL,
                action: MessageAction.PublishTool,
                topicId,
            } as any);
            const modules = await em.count(Message, {
                type: MessageType.MODULE,
                action: MessageAction.PublishModule,
                topicId,
            } as any);
            const schemas = await em.count(Message, {
                type: MessageType.SCHEMA,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
                topicId,
            } as any);
            const tokens = await em.count(Message, {
                type: MessageType.TOKEN,
                topicId,
            } as any);
            const roles = await em.count(Message, {
                type: MessageType.ROLE_DOCUMENT,
                topicId,
            } as any);
            const dids = await em.count(Message, {
                type: MessageType.DID_DOCUMENT,
                topicId,
            } as any);
            const vcs = await em.count(Message, {
                type: MessageType.VC_DOCUMENT,
                topicId,
            } as any);
            const vps = await em.count(Message, {
                type: MessageType.VP_DOCUMENT,
                topicId,
            } as any);
            const contracts = await em.count(Message, {
                type: MessageType.CONTRACT,
                topicId,
            } as any);

            const activity = {
                registries,
                topics,
                policies,
                tools,
                modules,
                schemas,
                tokens,
                roles,
                dids,
                vcs,
                vps,
                contracts,
            };

            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: topicId,
                    row,
                    activity,
                });
            }
            return new MessageResponse<IDetailsResults>({
                id: topicId,
                uuid: item.uuid,
                item,
                row,
                activity,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#region CONTRACTS
    @MessagePattern(IndexerMessageAPI.GET_CONTRACTS)
    async getContracts(
        @Payload() msg: IPageFilters
    ): Promise<AnyResponse<IPage<Message>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.CONTRACT;
            filters.action = MessageAction.CreateContract;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                Message,
                filters,
                options
            );
            const result: IPage<Message> = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_CONTRACT)
    async getContract(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<IDetailsResults>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = await em.findOne(Message, {
                type: MessageType.CONTRACT,
                action: MessageAction.CreateContract,
                messageId,
            } as any);
            const row = await em.findOne(Message, {
                consensusTimestamp: messageId,
            });
            if (!item) {
                return new MessageResponse<IDetailsResults>({
                    id: messageId,
                    row,
                });
            }
            return new MessageResponse<IDetailsResults>({
                id: messageId,
                uuid: item.uuid,
                item,
                row,
            });
        } catch (error) {
            return new MessageError(error);
        }
    }
    //#endregion
    //#endregion
}
