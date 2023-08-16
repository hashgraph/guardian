import { DatabaseServer, InboundMessageIdentityDeserializer, Logger, MessageError, MessageResponse, OutboundResponseIdentitySerializer } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import * as crypto from 'crypto';
import { HashComparator, ModuleComparator, ModuleModel, PolicyComparator, PolicyModel, PropertyType, SchemaComparator, SchemaModel, TokenModel } from '@analytics';
import { Controller, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import process from 'process';
import { ApiResponse } from '@api/helpers/api-response';

@Controller()
export class AnalyticsController {
}

/**
 * API analytics
 * @constructor
 */
export async function analyticsAPI(): Promise<void> {
    ApiResponse(MessageAPI.COMPARE_POLICIES, async (msg) => {
        try {
            const {
                type,
                ids,
                eventsLvl,
                propLvl,
                childrenLvl,
                idLvl
            } = msg;
            const options = {
                propLvl: parseInt(propLvl, 10),
                childLvl: parseInt(childrenLvl, 10),
                eventLvl: parseInt(eventsLvl, 10),
                idLvl: parseInt(idLvl, 10),
            };

            const compareModels: PolicyModel[] = [];
            for (const policyId of ids) {
                const compareModel = await PolicyComparator.createModel(policyId, options);
                if (compareModel) {
                    compareModels.push(compareModel);
                } else {
                    throw new Error('Unknown policies');
                }
            }

            const comparator = new PolicyComparator(options);
            if (compareModels.length === 2) {
                const result = comparator.compare(compareModels[0], compareModels[1]);
                if (type === 'csv') {
                    return new MessageResponse(comparator.tableToCsv(result));
                } else {
                    return new MessageResponse(result);
                }
            } else if (compareModels.length > 2) {
                const result = comparator.multiCompare(compareModels);
                if (type === 'csv') {
                    return new MessageResponse(comparator.multiTableToCsv(result));
                } else {
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

    ApiResponse(MessageAPI.COMPARE_MODULES, async (msg) => {
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
            const options = {
                propLvl: parseInt(propLvl, 10),
                childLvl: parseInt(childrenLvl, 10),
                eventLvl: parseInt(eventsLvl, 10),
                idLvl: parseInt(idLvl, 10),
            };

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

    ApiResponse(MessageAPI.COMPARE_SCHEMAS, async (msg) => {
        try {
            const {
                type,
                schemaId1,
                schemaId2,
                idLvl
            } = msg;

            const schema1 = await DatabaseServer.getSchemaById(schemaId1);
            const schema2 = await DatabaseServer.getSchemaById(schemaId2);
            const options = {
                propLvl: 2,
                childLvl: 0,
                eventLvl: 0,
                idLvl: parseInt(idLvl, 10)
            }

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

    ApiResponse(MessageAPI.SEARCH_POLICIES, async (msg) => {
        try {
            const { policyId } = msg;
            const threshold = 0;
            const policy = await DatabaseServer.getPolicyById(policyId);
            const result = [];
            if (!policy || !policy.hashMap) {
                return new MessageResponse(result);
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
            for (const item of policies) {
                if (policy.id !== item.id) {
                    const rate = HashComparator.compare(policy, item);
                    if (rate >= threshold) {
                        const tags = mapTags.has(item.id) ? Array.from(mapTags.get(item.id)) : [];
                        result.push({
                            id: item.id,
                            uuid: item.uuid,
                            name: item.name,
                            description: item.description,
                            version: item.version,
                            status: item.status,
                            topicId: item.topicId,
                            messageId: item.messageId,
                            owner: item.owner,
                            rate,
                            tags
                        })
                    }
                }
            }
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
                serializer: new OutboundResponseIdentitySerializer(),
                deserializer: new InboundMessageIdentityDeserializer(),
            }
        }]),
    ],
    controllers: [
        AnalyticsController
    ]
})
export class AnalyticsModule { }
