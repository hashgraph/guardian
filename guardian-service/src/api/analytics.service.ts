import { CompareOptions, DocumentComparator, DocumentModel, HashComparator, IChildrenLvl, IEventsLvl, IPropertiesLvl, ModuleComparator, ModuleModel, PolicyComparator, PolicyModel, PolicySearchModel, RootSearchModel, SchemaComparator, SchemaModel, ToolComparator, ToolModel } from '../analytics/index.js';
import { DatabaseServer, Logger, MessageError, MessageResponse } from '@guardian/common';
import { ApiResponse } from '../api/helpers/api-response.js';
import { MessageAPI, PolicyType, UserRole } from '@guardian/interfaces';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import process from 'process';

@Controller()
export class AnalyticsController {
}

/**
 * API analytics
 * @constructor
 */
export async function analyticsAPI(): Promise<void> {
    ApiResponse<any>(MessageAPI.COMPARE_POLICIES, async (msg) => {
        try {
            const {
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
                null
            );

            const compareModels: PolicyModel[] = [];
            for (const policyId of ids) {
                const compareModel = await PolicyComparator.createModelById(policyId, options);
                compareModels.push(compareModel);
            }

            const comparator = new PolicyComparator(options);
            const results = comparator.compare(compareModels);
            if (results.length === 1) {
                if (type === 'csv') {
                    const file = comparator.tableToCsv(results);
                    return new MessageResponse(file);
                } else {
                    const result = results[0];
                    return new MessageResponse(result);
                }
            } else if (results.length > 1) {
                if (type === 'csv') {
                    const file = comparator.tableToCsv(results)
                    return new MessageResponse(file);
                } else {
                    const result = comparator.mergeCompareResults(results);
                    return new MessageResponse(result);
                }
            } else {
                throw new Error('Invalid size');
            }
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.COMPARE_MODULES, async (msg) => {
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.COMPARE_SCHEMAS, async (msg) => {
        try {
            const {
                type,
                schemaId1,
                schemaId2,
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

            const schema1 = await DatabaseServer.getSchemaById(schemaId1);
            const schema2 = await DatabaseServer.getSchemaById(schemaId2);

            const policy1 = await DatabaseServer.getPolicy({ topicId: schema1?.topicId });
            const policy2 = await DatabaseServer.getPolicy({ topicId: schema2?.topicId });

            const model1 = new SchemaModel(schema1, options);
            const model2 = new SchemaModel(schema2, options);
            model1.setPolicy(policy1);
            model2.setPolicy(policy2);
            model1.update(options);
            model2.update(options);
            const comparator = new SchemaComparator(options);
            const result = comparator.compare(model1, model2);
            if (type === 'csv') {
                const csv = comparator.csv(result);
                return new MessageResponse(csv);
            } else {
                return new MessageResponse(result);
            }
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.SEARCH_POLICIES, async (msg) => {
        try {
            const { policyId } = msg;
            const threshold = 0;
            const policy = await DatabaseServer.getPolicyById(policyId);
            if (!policy || !policy.hashMap) {
                return new MessageResponse(null);
            }
            const policies = await DatabaseServer.getPolicies({
                $or: [{
                    owner: policy.owner,
                    hash: { $exists: true, $ne: null }
                }, {
                    status: 'PUBLISH',
                    hash: { $exists: true, $ne: null },
                    owner: { $ne: policy.owner }
                }]
            });
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

            const result: any = {
                target: null,
                result: []
            };
            for (const item of policies) {
                const policyTags = mapTags.has(item.id) ? Array.from(mapTags.get(item.id)) : [];
                if (policy.id !== item.id) {
                    const rate = HashComparator.compare(policy, item);
                    if (rate >= threshold) {
                        result.result.push({
                            id: item.id,
                            uuid: item.uuid,
                            name: item.name,
                            description: item.description,
                            version: item.version,
                            status: item.status,
                            topicId: item.topicId,
                            messageId: item.messageId,
                            owner: item.owner,
                            tags: policyTags,
                            rate,
                        })
                    }
                } else {
                    result.target = {
                        id: item.id,
                        uuid: item.uuid,
                        name: item.name,
                        description: item.description,
                        version: item.version,
                        status: item.status,
                        topicId: item.topicId,
                        messageId: item.messageId,
                        owner: item.owner,
                        tags: policyTags
                    }
                }
            }
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.COMPARE_DOCUMENTS, async (msg) => {
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
            for (const documentsId of ids) {
                const compareModel = await DocumentComparator.createModelById(documentsId, options);
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse<any>(MessageAPI.COMPARE_TOOLS, async (msg) => {
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
                const compareModel = await ToolComparator.createModelById(toolId, options);
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(MessageAPI.SEARCH_BLOCKS, async (msg) => {
        try {
            const {
                config,
                blockId
            } = msg;

            const filterPolicyModel = RootSearchModel.fromConfig(config);
            const filterBlock = filterPolicyModel.findBlock(blockId);
            if (!filterBlock) {
                return new MessageError('Unknown block');
            }

            const policyModels: PolicySearchModel[] = [];
            const policies = await DatabaseServer.getPolicies({ status: { $in: [PolicyType.PUBLISH, PolicyType.DISCONTINUED] }});
            for (const row of policies) {
                try {
                    const model = new PolicySearchModel(row);
                    policyModels.push(model);
                } catch (error) {
                    new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
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
