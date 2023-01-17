import { ApiResponse } from '@api/api-response';
import { DatabaseServer } from '@database-modules';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';
import * as crypto from 'crypto';
import { PolicyComparator, PolicyModel, PropertyType, SchemaComparator, SchemaModel, TokenModel } from '@analytics';

export async function analyticsAPI(channel: MessageBrokerChannel): Promise<void> {
    ApiResponse(channel, MessageAPI.COMPARE_POLICIES, async (msg) => {
        try {
            const {
                user,
                policyId1,
                policyId2,
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
            const policy1 = await DatabaseServer.getPolicyById(policyId1);
            const policy2 = await DatabaseServer.getPolicyById(policyId2);

            if (!policy1 || !policy2) {
                throw new Error('Unknown policies');
            }

            const policyModel1 = (new PolicyModel(policy1, options));
            const policyModel2 = (new PolicyModel(policy2, options));

            //Schemas
            const schemas1 = await DatabaseServer.getSchemas({ topicId: policy1.topicId });
            const schemas2 = await DatabaseServer.getSchemas({ topicId: policy2.topicId });

            const schemaModels1: SchemaModel[] = [];
            const schemaModels2: SchemaModel[] = [];
            for (const schema of schemas1) {
                const m = new SchemaModel(schema, options);
                m.update(options);
                schemaModels1.push(m);
            }
            for (const schema of schemas2) {
                const m = new SchemaModel(schema, options);
                m.update(options);
                schemaModels2.push(m);
            }
            policyModel1.setSchemas(schemaModels1);
            policyModel2.setSchemas(schemaModels2);

            //Tokens
            const tokensIds1 = policyModel1.getAllProp<string>(PropertyType.Token)
                .filter(t => t.value)
                .map(t => t.value);
            const tokensIds2 = policyModel2.getAllProp<string>(PropertyType.Token)
                .filter(t => t.value)
                .map(t => t.value);

            const tokens1 = await DatabaseServer.getTokens({ where: { tokenId: { $in: tokensIds1 } } });
            const tokens2 = await DatabaseServer.getTokens({ where: { tokenId: { $in: tokensIds2 } } });

            const tokenModels1: TokenModel[] = [];
            const tokenModels2: TokenModel[] = [];
            for (const token of tokens1) {
                const t = new TokenModel(token, options);
                t.update(options);
                tokenModels1.push(t);
            }
            for (const token of tokens2) {
                const t = new TokenModel(token, options);
                t.update(options);
                tokenModels2.push(t);
            }
            policyModel1.setTokens(tokenModels1);
            policyModel2.setTokens(tokenModels2);

            //Artifacts
            const files1 = await DatabaseServer.getArtifacts({ policyId: policyId1 });
            const files2 = await DatabaseServer.getArtifacts({ policyId: policyId2 });
            const artifactsModels1: any[] = [];
            const artifactsModels2: any[] = [];
            for (const file of files1) {
                const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
                const sha256 = crypto
                    .createHash('sha256')
                    .update(data)
                    .digest()
                    .toString();
                artifactsModels1.push({ uuid: file.uuid, data: sha256 });
            }
            for (const file of files2) {
                const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
                const sha256 = crypto
                    .createHash('sha256')
                    .update(data)
                    .digest()
                    .toString();
                artifactsModels2.push({ uuid: file.uuid, data: sha256 });
            }
            policyModel1.setArtifacts(artifactsModels1);
            policyModel2.setArtifacts(artifactsModels2);

            //Compare
            policyModel1.update();
            policyModel2.update();

            const comparator = new PolicyComparator(options);
            const result = comparator.compare(policyModel1, policyModel2);
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.COMPARE_SCHEMAS, async (msg) => {
        try {
            const { user, schemaId1, schemaId2, idLvl } = msg;

            const schema1 = await DatabaseServer.getSchemaById(schemaId1);
            const schema2 = await DatabaseServer.getSchemaById(schemaId2);
            const options = {
                propLvl: 2,
                childLvl: 0,
                eventLvl: 0,
                idLvl: parseInt(idLvl, 10)
            }

            const model1 = new SchemaModel(schema1, options);
            const model2 = new SchemaModel(schema2, options);
            model1.update(options);
            model2.update(options);
            const comparator = new SchemaComparator(options);
            const result = comparator.compare(model1, model2);

            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });
}
