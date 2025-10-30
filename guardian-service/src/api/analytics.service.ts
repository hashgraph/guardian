import {
    PolicyLoader,
    CompareOptions,
    DocumentComparator,
    DocumentModel,
    HashComparator,
    IChildrenLvl,
    IEventsLvl,
    IPropertiesLvl,
    ModuleComparator,
    ModuleModel,
    PolicyComparator,
    PolicyModel,
    PolicySearchModel,
    RootSearchModel,
    SchemaComparator,
    SchemaModel,
    ToolComparator,
    ToolModel,
    ToolLoader,
    DocumentLoader,
    SchemaLoader
} from '../analytics/index.js';
import {
    DatabaseServer,
    IAuthUser,
    MessageError,
    MessageResponse,
    Policy,
    VpDocument as VpDocumentCollection,
    VcDocument as VcDocumentCollection,
    Workers,
    PinoLogger,
    VpDocument,
    getVCField
} from '@guardian/common';
import { ApiResponse } from '../api/helpers/api-response.js';
import { IOwner, MessageAPI, PolicyStatus, UserRole, WorkerTaskType } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import process from 'process';

interface ISearchResult {
    type: string,
    id: string,
    topicId: string,
    messageId: string,
    uuid: string,
    name: string,
    description: string,
    version: string,
    status: string,
    owner: string,
    vcCount: number,
    vpCount: number,
    tokensCount: number,
    rate: number,
    tags: string[]
}

function getAmount(vp: VpDocument): number {
    const vcs = vp.document.verifiableCredential || [];
    const mintIndex = Math.max(1, vcs.length - 1);
    const mint = vcs[mintIndex];
    return Number(getVCField(mint, 'amount')) || 0;
}

async function localSearch(
    user: IOwner,
    type: string,
    options: {
        text?: string,
        owner?: string,
        minVcCount?: number,
        minVpCount?: number,
        minTokensCount?: number,
        blocks?: {
            hash: string;
            hashMap: any;
            threshold: number;
        },
        toolMessageIds?: string[],
        toolName?: string,
        toolVersion?: string
    }
): Promise<ISearchResult[]> {
    const filter: any = {
        $and: []
    };
    if (type === 'Local') {
        filter.$and.push({
            status: 'PUBLISH',
            hash: { $exists: true, $ne: null }
        });
    } else {
        filter.$and.push({
            $or: [
                {
                    owner: user.creator,
                },
                {
                    creator: user.creator,
                },
            ],
            hash: { $exists: true, $ne: null }
        });
    }
    if (options.text) {
        const keywords = options.text.split(' ');
        for (const keyword of keywords) {
            filter.$and.push({
                'name': {
                    $regex: `.*${keyword.trim()}.*`,
                    $options: 'si',
                },
            });
        }
    }
    if (options.owner) {
        filter.$and.push({
            owner: options.owner
        });
    }
    if (options.toolMessageIds) {
        filter.$and.push({
            ['tools.messageId']: { $in: options.toolMessageIds }
        });
    }
    console.log(JSON.stringify(filter, null, 4));
    
    if (options.toolName) {
        filter.$and.push({
            ['tools.name']: { $regex: `.*${options.toolName.trim()}.*`, $options: 'i' }
        });
    }
    if (options.toolVersion) {
        filter.$and.push({
            ['tools.version']: { $regex: `.*${options.toolVersion.trim()}.*`, $options: 'i' }
        });
    }

    const dataBaseServer = new DatabaseServer();

    let policies: any[] = await dataBaseServer.find(Policy, filter);
    for (const policy of policies) {
        policy.vcCount = await dataBaseServer.count(VcDocumentCollection, { policyId: policy.id });
    }
    if (options.minVcCount) {
        policies = policies.filter((policy) => policy.vcCount >= options.minVcCount);
    }
    for (const policy of policies) {
        policy.vpCount = await dataBaseServer.count(VpDocumentCollection, { policyId: policy.id });
    }
    if (options.minVpCount) {
        policies = policies.filter((policy) => policy.vpCount >= options.minVpCount);
    }
    for (const policy of policies) {
        const vps = await dataBaseServer.find(VpDocumentCollection, { policyId: policy.id });
        policy.tokensCount = vps.map((vp) => getAmount(vp)).reduce((sum, amount) => sum + amount, 0);
    }
    if (options.minTokensCount) {
        policies = policies.filter((policy) => policy.tokensCount >= options.minTokensCount);
    }
    if (options.blocks) {
        for (const policy of policies) {
            try {
                policy.rate = HashComparator.compare(options.blocks, policy);
            } catch (error) {
                policy.rate = 0;
            }
        }
        policies = policies.filter((policy) => policy.rate >= options.blocks.threshold);
        policies.sort((a, b) => a.rate > b.rate ? -1 : 1);
    }

    const ids = policies.map(p => p.id.toString());
    const tags = await DatabaseServer.getTags({
        localTarget: { $in: ids }
    }, {
        fields: ['localTarget', 'name']
    })
    const mapTags = new Map<string, Set<string>>();
    for (const tag of tags) {
        if (mapTags.has(tag.localTarget)) {
            mapTags.get(tag.localTarget).add(tag.name);
        } else {
            mapTags.set(tag.localTarget, new Set([tag.name]));
        }
    }

    return policies.map((policy) => {
        const policyTags = mapTags.has(policy.id) ? Array.from(mapTags.get(policy.id)) : [];
        return {
            type: 'Local',
            id: policy.id,
            topicId: policy.topicId,
            messageId: policy.messageId,
            uuid: policy.uuid,
            name: policy.name,
            description: policy.description,
            version: policy.version,
            status: policy.status,
            owner: policy.owner,
            vcCount: policy.vcCount,
            vpCount: policy.vpCount,
            tokensCount: policy.tokensCount,
            rate: policy.rate,
            tags: policyTags
        }
    })
}

async function globalSearch(options: any, userId: string | null): Promise<ISearchResult[]> {
    const policies = await new Workers().addNonRetryableTask({
        type: WorkerTaskType.ANALYTICS_SEARCH_POLICIES,
        data: {
            payload: { options, userId }
        }
    }, {
        priority: 2
    });
    if (!policies) {
        throw new Error('Invalid response');
    }
    return policies.map((policy: any) => {
        return {
            type: 'Global',
            topicId: policy.topicId,
            messageId: policy.messageId,
            uuid: policy.uuid,
            name: policy.name,
            description: policy.description,
            version: policy.version,
            status: 'PUBLISH',
            owner: policy.owner,
            vcCount: policy.vcCount,
            vpCount: policy.vpCount,
            tokensCount: policy.tokensCount,
            rate: policy.rate,
            tags: policy.tags,
        }
    })
}

@Controller()
export class AnalyticsController {
}

/**
 * API analytics
 * @constructor
 */
export async function analyticsAPI(logger: PinoLogger): Promise<void> {
    ApiResponse<any>(MessageAPI.COMPARE_POLICIES,
        async (msg: {
            user: IOwner,
            type: string,
            policies: {
                type: 'id' | 'file' | 'message',
                value: string | {
                    id: string,
                    name: string,
                    value: string
                }
            }[],
            options: {
                propLvl: string | number,
                childrenLvl: string | number,
                eventsLvl: string | number,
                idLvl: string | number
            },
        }) => {
            try {
                const { user, type, policies, options } = msg;
                const compareOptions = CompareOptions.from(options);

                const compareModels: PolicyModel[] = [];
                for (const policy of policies) {
                    const rawData = await PolicyLoader.load(policy, user);
                    const compareModel = await PolicyLoader.create(rawData, compareOptions);
                    compareModels.push(compareModel);
                }

                const comparator = new PolicyComparator(compareOptions);
                const results = comparator.compare(compareModels);
                const result = comparator.to(results, type);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse<any>(MessageAPI.COMPARE_MODULES,
        async (msg: {
            user: IAuthUser,
            type: string,
            moduleId1: string,
            moduleId2: string,
            eventsLvl: string | number,
            propLvl: string | number,
            childrenLvl: string | number,
            idLvl: string | number,
        }) => {
            try {
                const {
                    type,
                    moduleId1,
                    moduleId2,
                    eventsLvl,
                    propLvl,
                    childrenLvl,
                    idLvl
                } = msg;
                const options = new CompareOptions(
                    propLvl,
                    childrenLvl,
                    eventsLvl,
                    idLvl,
                    null,
                    null,
                    null
                );

                //Policy
                const module1 = await DatabaseServer.getModuleById(moduleId1);
                const module2 = await DatabaseServer.getModuleById(moduleId2);

                if (!module1 || !module2) {
                    throw new Error('Unknown modules');
                }

                const model1 = new ModuleModel(module1, options);
                const model2 = new ModuleModel(module2, options);

                //Compare
                model1.update();
                model2.update();

                const comparator = new ModuleComparator(options);
                const result = comparator.compare(model1, model2);
                if (type === 'csv') {
                    const csv = comparator.csv(result);
                    return new MessageResponse(csv);
                } else {
                    return new MessageResponse(result);
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse<any>(MessageAPI.COMPARE_SCHEMAS,
        async (msg: {
            user: IOwner,
            type: string,
            schemas: {
                type: 'id' | 'policy-message' | 'policy-file',
                value: string,
                policy?: string | {
                    id: string,
                    name: string,
                    value: string
                }
            }[],
            idLvl: string | number,
        }) => {
            try {
                const {
                    user,
                    type,
                    schemas,
                    idLvl
                } = msg;
                const options = new CompareOptions(
                    IPropertiesLvl.All,
                    IChildrenLvl.None,
                    IEventsLvl.None,
                    idLvl,
                    null,
                    null,
                    null
                );

                const compareModels: SchemaModel[] = [];
                for (const schema of schemas) {
                    const rawData = await SchemaLoader.load(schema, user);
                    const compareModel = await SchemaLoader.create(rawData, options);
                    compareModels.push(compareModel);
                }

                const comparator = new SchemaComparator(options);
                const result = comparator.compare(compareModels[0], compareModels[1]);
                if (type === 'csv') {
                    const csv = comparator.csv(result);
                    return new MessageResponse(csv);
                } else {
                    return new MessageResponse(result);
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse<any>(MessageAPI.SEARCH_POLICIES,
        async (msg: {
            user: IOwner,
            filters: {
                policyId?: string;
                type?: string;
                minVcCount?: number;
                minVpCount?: number;
                minTokensCount?: number;
                text?: string;
                owner?: string;
                threshold?: number;
                toolMessageIds?: string[];
                toolName?: string;
                toolVersion?: string;
            },
            userId: string | null
        }) => {
            const userId = msg?.userId;
            try {
                const { user, filters } = msg;
                const {
                    policyId,
                    type,
                    text,
                    owner,
                    minVcCount,
                    minVpCount,
                    minTokensCount,
                    threshold,
                    toolMessageIds,
                    toolName,
                    toolVersion
                } = filters;
                const options = {
                    text,
                    owner,
                    minVcCount,
                    minVpCount,
                    minTokensCount,
                    blocks: undefined,
                    toolMessageIds,
                    toolName,
                    toolVersion
                }
    console.log(toolMessageIds);
                const result: any = {
                    target: null,
                    result: []
                };
                if (policyId) {
                    const policy = await DatabaseServer.getPolicyById(policyId);
                    if (!policy || !policy.hashMap || policy.owner !== user.creator) {
                        return new MessageResponse(null);
                    }
                    options.blocks = {
                        hash: policy.hash,
                        hashMap: policy.hashMap,
                        threshold: threshold && threshold > 0 ? threshold : 0
                    }
                    result.target = {
                        id: policyId,
                        messageId: policy.messageId,
                        topicId: policy.topicId,
                        uuid: policy.uuid,
                        name: policy.name,
                        description: policy.description,
                        version: policy.version,
                        status: policy.status,
                        owner: policy.owner,
                    };
                }

                let policies: ISearchResult[];
                if (type === 'Global') {
                    policies = await globalSearch(options, userId)
                } else {
                    policies = await localSearch(user, type, options)
                }
                for (const item of policies) {
                    if (
                        result.target &&
                        (
                            (result.target.id && item.id === result.target.id) ||
                            (result.target.messageId && item.messageId === result.target.messageId)
                        )
                    ) {
                        result.target = item;
                    } else {
                        result.result.push(item);
                    }
                }
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    ApiResponse<any>(MessageAPI.COMPARE_DOCUMENTS,
        async (msg: {
            user: IAuthUser,
            type: string,
            ids: string[],
            eventsLvl: string | number,
            propLvl: string | number,
            childrenLvl: string | number,
            idLvl: string | number,
            keyLvl: string | number,
            refLvl: string | number,
        }) => {
            try {
                const {
                    user,
                    type,
                    ids,
                    eventsLvl,
                    propLvl,
                    childrenLvl,
                    idLvl,
                    keyLvl,
                    refLvl
                } = msg;
                const options = new CompareOptions(
                    propLvl,
                    childrenLvl,
                    eventsLvl,
                    idLvl,
                    keyLvl,
                    refLvl,
                    user?.role === UserRole.STANDARD_REGISTRY ? user.did : null
                );

                const compareModels: DocumentModel[] = [];
                const loader = new DocumentLoader(options);
                for (const documentsId of ids) {
                    const compareModel = await loader.createDocument(documentsId);
                    if (!compareModel) {
                        return new MessageError('Unknown document');
                    }
                    compareModels.push(compareModel);
                }

                const comparator = new DocumentComparator(options);
                const results = comparator.compare(compareModels);
                if (results.length === 1) {
                    if (type === 'csv') {
                        const file = DocumentComparator.tableToCsv(results);
                        return new MessageResponse(file);
                    } else {
                        const result = results[0];
                        return new MessageResponse(result);
                    }
                } else if (results.length > 1) {
                    if (type === 'csv') {
                        const file = DocumentComparator.tableToCsv(results);
                        return new MessageResponse(file);
                    } else {
                        const result = comparator.mergeCompareResults(results);
                        return new MessageResponse(result);
                    }
                } else {
                    return new MessageError('Invalid size');
                }
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse<any>(MessageAPI.COMPARE_VP_DOCUMENTS, async (msg: {
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number,
        keyLvl: string | number,
        refLvl: string | number,
    }) => {
        try {
            const {
                user,
                // type,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl,
                keyLvl,
                refLvl
            } = msg;
            const options = new CompareOptions(
                propLvl,
                childrenLvl,
                eventsLvl,
                idLvl,
                keyLvl,
                refLvl,
                user?.role === UserRole.STANDARD_REGISTRY ? user.did : null
            );

            const vpDocuments: VpDocumentCollection[][] = await Promise.all(ids.map(async (id) => {
                return await DatabaseServer.getVPs({ policyId: id });
            }))
            // const minLength = Math.min.apply(null, vpDocuments.map(d => d.length));

            const comparisonVpArray = []

            const loader = new DocumentLoader(options);
            const preComparator = new DocumentComparator(options);
            for (const vp1 of vpDocuments[0]) {
                let r;
                let lastRate = 0;
                for (const vp2 of vpDocuments[1]) {
                    const _r = preComparator.compare([
                        await loader.createDocument(vp1.id),
                        await loader.createDocument(vp2.id)
                    ])
                    if (Array.isArray(_r) && _r[0]) {
                        if (!r) {
                            lastRate = _r[0].total;
                            r = _r
                        } else {
                            if (_r[0].total > lastRate) {
                                lastRate = _r[0].total;
                                r = _r
                            }
                        }
                    }
                }
                if (Array.isArray(r) && r[0]) {
                    comparisonVpArray.push(r[0]);
                }
            }
            return new MessageResponse(comparisonVpArray);

        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.COMPARE_TOOLS, async (msg: {
        user: IAuthUser,
        type: string,
        ids: string[],
        eventsLvl: string | number,
        propLvl: string | number,
        childrenLvl: string | number,
        idLvl: string | number,
    }) => {
        try {
            const {
                user,
                type,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            } = msg;
            const options = new CompareOptions(
                propLvl,
                childrenLvl,
                eventsLvl,
                idLvl,
                null,
                null,
                user?.role === UserRole.STANDARD_REGISTRY ? user.did : null
            );

            const compareModels: ToolModel[] = [];
            for (const toolId of ids) {
                const rawData = await ToolLoader.load(toolId);
                const compareModel = await ToolLoader.create(rawData, options);
                if (!compareModel) {
                    return new MessageError('Unknown tool');
                }
                compareModels.push(compareModel);
            }

            const comparator = new ToolComparator(options);
            const results = comparator.compare(compareModels);
            if (results.length === 1) {
                if (type === 'csv') {
                    const file = ToolComparator.tableToCsv(results);
                    return new MessageResponse(file);
                } else {
                    const result = results[0];
                    return new MessageResponse(result);
                }
            } else if (results.length > 1) {
                if (type === 'csv') {
                    const file = ToolComparator.tableToCsv(results);
                    return new MessageResponse(file);
                } else {
                    const result = ToolComparator.mergeCompareResults(results);
                    return new MessageResponse(result);
                }
            } else {
                return new MessageError('Invalid size');
            }
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.SEARCH_BLOCKS,
        async (msg: {
            config: any,
            blockId: string,
            user: IAuthUser
        }) => {
            try {
                const {
                    config,
                    blockId,
                    user
                } = msg;

                const filterPolicyModel = RootSearchModel.fromConfig(config);
                const filterBlock = filterPolicyModel.findBlock(blockId);
                if (!filterBlock) {
                    return new MessageError('Unknown block');
                }

                const policyModels: PolicySearchModel[] = [];
                const policies = await DatabaseServer.getPolicies({
                    status: { $in: [PolicyStatus.PUBLISH, PolicyStatus.DISCONTINUED] }
                });
                for (const row of policies) {
                    try {
                        const model = new PolicySearchModel(row);
                        policyModels.push(model);
                    } catch (error) {
                        await logger.error(error, ['GUARDIAN_SERVICE'], user.id);
                    }
                }

                const result: any[] = [];
                for (const policyModel of policyModels) {
                    const chains = policyModel
                        .search(filterBlock)
                        .map(item => item.toJson());
                    if (chains.length) {
                        const max = chains[0].hash;
                        result.push({
                            name: policyModel.name,
                            description: policyModel.description,
                            version: policyModel.version,
                            owner: policyModel.owner,
                            topicId: policyModel.topicId,
                            messageId: policyModel.messageId,
                            hash: max,
                            chains
                        })
                    }
                }
                result.sort((a, b) => a.hash > b.hash ? -1 : 1);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], msg?.user?.id);
                return new MessageError(error);
            }
        });

    ApiResponse(MessageAPI.GET_INDEXER_AVAILABILITY,
        async (msg: { user: IAuthUser }) => {
            try {
                const user = msg.user;
                const result = await new Workers().addNonRetryableTask({
                    type: WorkerTaskType.ANALYTICS_GET_INDEXER_AVAILABILITY,
                    data: { payload: { userId: user?.id } }
                }, {
                    priority: 2
                });

                return new MessageResponse(result);
            } catch (error) {
                return new MessageResponse(false);
            }
        });
}

@Module({
    imports: [
        ClientsModule.register([{
            name: 'analytics-service',
            transport: Transport.NATS,
            options: {
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ],
                queue: 'analytics-service',
                // serializer: new OutboundResponseIdentitySerializer(),
                // deserializer: new InboundMessageIdentityDeserializer(),
            }
        }]),
    ],
    controllers: [
        AnalyticsController
    ]
})
export class AnalyticsModule { }
