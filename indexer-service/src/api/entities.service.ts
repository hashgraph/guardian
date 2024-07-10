import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    AnyResponse,
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
    PageFilters,
    RegistryDetails,
    IRelationshipsResults,
    ISchemaTreeResult,
    Registry,
    Page,
    RegistryUser,
    RegistryUserDetails,
    Policy,
    PolicyDetails,
    Tool,
    ToolDetails,
    Module,
    ModuleDetails,
    ISchema,
    SchemaDetails,
    Role,
    RoleDetails,
    DID,
    DIDDetails,
    VP,
    VPDetails,
    VC,
    VCDetails,
    Contract,
    ContractDetails,
    Topic,
    TopicDetails,
    TokenDetails,
    Token,
    NFTDetails,
    NFT,
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

function parsePageFilters(msg: PageFilters) {
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Registry>>> {
        try {
            const options = parsePageParams(msg);
            const filters = Object.assign(
                parseKeywordFilter(msg.keywords),
                parsePageFilters(msg)
            );
            filters.type = MessageType.STANDARD_REGISTRY;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Registry[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Registry>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_REGISTRY)
    async getRegistry(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<RegistryDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.STANDARD_REGISTRY,
            })) as Registry;
            const row: any = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<RegistryDetails>({
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

            return new MessageResponse<RegistryDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<RegistryUser>>> {
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
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [RegistryUser[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<RegistryUser>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_REGISTRY_USER)
    async getRegistryUser(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<RegistryUserDetails>> {
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
            const item = (await em.findOne(Message, {
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
            } as any)) as RegistryUser;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<RegistryUserDetails>({
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

            return new MessageResponse<RegistryUserDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Policy>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.INSTANCE_POLICY;
            filters.action = MessageAction.PublishPolicy;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Policy[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Policy>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_POLICY)
    async getPolicy(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<PolicyDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.INSTANCE_POLICY,
                action: MessageAction.PublishPolicy,
            } as any)) as Policy;
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
                return new MessageResponse<PolicyDetails>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            return new MessageResponse<PolicyDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Tool>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.TOOL;
            filters.action = MessageAction.PublishTool;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Tool[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Tool>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_TOOL)
    async getTool(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<ToolDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.TOOL,
                action: MessageAction.PublishTool,
            } as any)) as Tool;
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
                return new MessageResponse<ToolDetails>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            return new MessageResponse<ToolDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Module>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.MODULE;
            filters.action = MessageAction.PublishModule;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Module[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Module>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_MODULE)
    async getModule(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<ModuleDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.MODULE,
                action: MessageAction.PublishModule,
            } as any)) as Module;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<ModuleDetails>({
                    id: messageId,
                    row,
                });
            }

            return new MessageResponse<ModuleDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<ISchema>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.SCHEMA;
            filters.action = MessageAction.PublishSchema;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [ISchema[], number];
            const result = {
                items: rows.map((item) => {
                    delete item.analytics;
                    return item;
                }),
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<ISchema>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_SCHEMA)
    async getSchema(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<SchemaDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.SCHEMA,
                action: {
                    $in: [
                        MessageAction.PublishSchema,
                        MessageAction.PublishSystemSchema,
                    ],
                },
            } as any)) as ISchema;
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
                return new MessageResponse<SchemaDetails>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            await loadDocuments(item);

            return new MessageResponse<SchemaDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Token>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                TokenCache,
                filters,
                options
            );
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Token>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_TOKEN)
    async getToken(
        @Payload() msg: { tokenId: string }
    ): Promise<AnyResponse<TokenDetails>> {
        try {
            const { tokenId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const row = await em.findOne(TokenCache, {
                tokenId,
            });
            return new MessageResponse<TokenDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Role>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.ROLE_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Role[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Role>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_ROLE)
    async getRole(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<RoleDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.ROLE_DOCUMENT,
            } as any)) as Role;
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
                return new MessageResponse<RoleDetails>({
                    id: messageId,
                    row,
                    activity,
                });
            }

            await loadDocuments(item);

            return new MessageResponse<RoleDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<DID>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.DID_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [DID[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<DID>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_DID_DOCUMENT)
    async getDidDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<DIDDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.DID_DOCUMENT,
            })) as DID;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<DIDDetails>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);
            const history = (await em.find(
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
            )) as DID[];
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<DIDDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<VP>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VP_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [VP[], number];
            const result = {
                items: rows.map((item) => {
                    delete item.analytics;
                    return item;
                }),
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<VP>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VP_DOCUMENT)
    async getVpDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<VPDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VP_DOCUMENT,
            })) as VP;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<VPDetails>({
                    id: messageId,
                    row,
                });
            }

            await loadDocuments(item);
            const history = (await em.find(
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
            )) as VP[];
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<VPDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<VC>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.VC_DOCUMENT;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [VC[], number];
            const result = {
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
            return new MessageResponse<Page<VC>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_VC_DOCUMENT)
    async getVcDocument(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<VCDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                consensusTimestamp: messageId,
                type: MessageType.VC_DOCUMENT,
            })) as VC;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });

            if (!item) {
                return new MessageResponse<VCDetails>({
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
            const history = (await em.find(
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
            )) as VC[];
            for (const row of history) {
                await loadDocuments(row);
            }
            return new MessageResponse<VCDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<NFT>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = await em.findAndCount(
                NftCache,
                filters,
                options
            );
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<NFT>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }

    @MessagePattern(IndexerMessageAPI.GET_NFT)
    async getNFT(
        @Payload() msg: { tokenId: string; serialNumber: string }
    ): Promise<AnyResponse<NFTDetails>> {
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
            return new MessageResponse<NFTDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Topic>>> {
        try {
            const options = parsePageParams(msg);
            const filters = parsePageFilters(msg);
            filters.type = MessageType.TOPIC;
            filters.action = MessageAction.CreateTopic;
            filters['options.childId'] = null;
            const em = DataBaseHelper.getEntityManager();
            const [rows, count] = (await em.findAndCount(
                Message,
                filters,
                options
            )) as [Topic[], number];
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Topic>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_TOPIC)
    async getTopic(
        @Payload() msg: { topicId: string }
    ): Promise<AnyResponse<TopicDetails>> {
        try {
            const { topicId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                type: MessageType.TOPIC,
                action: MessageAction.CreateTopic,
                'options.childId': null,
                topicId,
            } as any)) as Topic;
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
                return new MessageResponse<TopicDetails>({
                    id: topicId,
                    row,
                    activity,
                });
            }
            return new MessageResponse<TopicDetails>({
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
        @Payload() msg: PageFilters
    ): Promise<AnyResponse<Page<Contract>>> {
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
            const result = {
                items: rows,
                pageIndex: options.offset / options.limit,
                pageSize: options.limit,
                total: count,
                order: options.orderBy,
            };
            return new MessageResponse<Page<Contract>>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
    @MessagePattern(IndexerMessageAPI.GET_CONTRACT)
    async getContract(
        @Payload() msg: { messageId: string }
    ): Promise<AnyResponse<ContractDetails>> {
        try {
            const { messageId } = msg;
            const em = DataBaseHelper.getEntityManager();
            const item = (await em.findOne(Message, {
                type: MessageType.CONTRACT,
                action: MessageAction.CreateContract,
                messageId,
            } as any)) as Contract;
            const row = await em.findOne(MessageCache, {
                consensusTimestamp: messageId,
            });
            if (!item) {
                return new MessageResponse<ContractDetails>({
                    id: messageId,
                    row,
                });
            }
            return new MessageResponse<ContractDetails>({
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
