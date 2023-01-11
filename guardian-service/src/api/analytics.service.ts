import { ApiResponse } from '@api/api-response';
import { DatabaseServer } from '@database-modules';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import * as crypto from 'crypto';
import { PolicyComparator, PolicyModel, SchemaComparator, SchemaModel } from '@analytics';

async function loadPolicy(policyId: string) {
    const policy = await DatabaseServer.getPolicyById(policyId);
    if (!policy) {
        throw new Error('Unknown policies');
    }
    const files = await DatabaseServer.getArtifacts({ policyId });
    const artifacts: any = [];
    for (const file of files) {
        const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
        const sha256 = crypto
            .createHash('sha256')
            .update(data)
            .digest()
            .toString();
        artifacts.push({ uuid: file.uuid, data: sha256 });
    }
    const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });
    return { policy, artifacts, schemas };
}

export async function analyticsAPI(channel: MessageBrokerChannel): Promise<void> {
    ApiResponse(channel, MessageAPI.COMPARE_POLICIES, async (msg) => {
        try {
            const { user, policyId1, policyId2, eventsLvl, propLvl, childrenLvl } = msg;

            const policy1 = await loadPolicy(policyId1);
            const policy2 = await loadPolicy(policyId2);

            const options = {
                propLvl: parseInt(propLvl, 10),
                childLvl: parseInt(childrenLvl, 10),
                eventLvl: parseInt(eventsLvl, 10),
            };

            const schemas1: SchemaModel[] = [];
            const schemas2: SchemaModel[] = [];
            for (const schema of policy1.schemas) {
                schemas1.push(new SchemaModel(schema, options));
            }
            for (const schema of policy2.schemas) {
                schemas2.push(new SchemaModel(schema, options));
            }
            const model1 = new PolicyModel(
                policy1.policy,
                policy1.artifacts,
                schemas1,
                options
            );
            const model2 = new PolicyModel(
                policy2.policy,
                policy2.artifacts,
                schemas2,
                options
            );
            const comparator = new PolicyComparator(options);
            const result = comparator.compare(model1, model2);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.COMPARE_SCHEMAS, async (msg) => {
        try {
            const { user, schemaId1, schemaId2 } = msg;

            const schema1 = await DatabaseServer.getSchemaById(schemaId1);
            const schema2 = await DatabaseServer.getSchemaById(schemaId2);
            const options = {
                propLvl: 2,
                childLvl: 0,
                eventLvl: 0
            }
            const model1 = new SchemaModel(schema1, options);
            const model2 = new SchemaModel(schema2, options);
            const comparator = new SchemaComparator(options);
            const result = comparator.compare(model1, model2);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
