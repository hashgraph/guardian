import { DatabaseServer, Hashing, Policy, Schema } from '@guardian/common';
import { PolicyModel } from '../models/policy.model';
import { SchemaModel } from '../models/schema.model';
import { PropertyType } from '../types/property.type';
import { TokenModel } from '../models/token.model';
import { FileModel } from '../models/file.model';
import * as crypto from 'crypto';

/**
 * Component for comparing two policies
 */
export class MessageComparator {
    private static readonly options = {
        childLvl: 2,
        eventLvl: 1,
        idLvl: 0,
        propLvl: 2
    };

    public static async createModel(policyId: string): Promise<PolicyModel> {
        try {
            //Policy
            const policy = await DatabaseServer.getPolicyById(policyId);

            if (!policy) {
                throw new Error('Unknown policy');
            }

            const policyModel = (new PolicyModel(policy, MessageComparator.options));

            //Schemas
            const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });

            const schemaModels: SchemaModel[] = [];
            for (const schema of schemas) {
                const m = new SchemaModel(schema, MessageComparator.options);
                m.setPolicy(policy);
                m.update(MessageComparator.options);
                schemaModels.push(m);
            }
            policyModel.setSchemas(schemaModels);

            //Tokens
            const tokensIds = policyModel.getAllProp<string>(PropertyType.Token)
                .filter(t => t.value)
                .map(t => t.value);

            const tokens = await DatabaseServer.getTokens({ where: { tokenId: { $in: tokensIds } } });

            const tokenModels: TokenModel[] = [];
            for (const token of tokens) {
                const t = new TokenModel(token, MessageComparator.options);
                t.update(MessageComparator.options);
                tokenModels.push(t);
            }
            policyModel.setTokens(tokenModels);

            //Artifacts
            const files = await DatabaseServer.getArtifacts({ policyId: policyId });
            const artifactsModels: FileModel[] = [];
            for (const file of files) {
                const data = await DatabaseServer.getArtifactFileByUUID(file.uuid);
                const f = new FileModel(file, data, MessageComparator.options);
                f.update(MessageComparator.options);
                artifactsModels.push(f);
            }
            policyModel.setArtifacts(artifactsModels);

            //Compare
            policyModel.update();

            return policyModel;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public static async createModelByFile(file: any): Promise<PolicyModel> {
        try {
            if (!file) {
                throw new Error('Invalid file');
            }

            const { policy, schemas, tokens, artifacts } = file;

            //Policy
            const policyModel = (new PolicyModel(policy, MessageComparator.options));

            //Schemas
            const schemaModels: SchemaModel[] = [];
            for (const schema of schemas) {
                const m = new SchemaModel(schema, MessageComparator.options);
                m.setPolicy(policy);
                m.update(MessageComparator.options);
                schemaModels.push(m);
            }
            policyModel.setSchemas(schemaModels);

            //Tokens
            const tokenModels: TokenModel[] = [];
            for (const row of tokens) {
                const token: any = {
                    tokenId: row.tokenId,
                    tokenName: row.tokenName,
                    tokenSymbol: row.tokenSymbol,
                    tokenType: row.tokenType,
                    decimals: row.decimals,
                    initialSupply: row.initialSupply,
                    enableAdmin: !!(row.enableAdmin || row.adminKey),
                    enableFreeze: !!(row.enableFreeze || row.freezeKey),
                    enableKYC: !!(row.enableKYC || row.kycKey),
                    enableWipe: !!(row.enableWipe || row.wipeKey),
                }
                const t = new TokenModel(token, MessageComparator.options);
                t.update(MessageComparator.options);
                tokenModels.push(t);
            }
            policyModel.setTokens(tokenModels);

            //Artifacts
            const artifactsModels: FileModel[] = [];
            for (const artifact of artifacts) {
                const f = new FileModel(artifact, artifact.data, MessageComparator.options);
                f.update(MessageComparator.options);
                artifactsModels.push(f);
            }
            policyModel.setArtifacts(artifactsModels);

            //Compare
            policyModel.update();

            return policyModel;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public static createTree(policy: PolicyModel): any {
        try {
            if (!policy) {
                return null;
            }

            const json: any = {};
            if (policy.roles) {
                json.roles = policy.roles.map(item => item.toWeight(policy.options));
            }
            if (policy.groups) {
                json.groups = policy.groups.map(item => item.toWeight(policy.options));
            }
            if (policy.topics) {
                json.topics = policy.topics.map(item => item.toWeight(policy.options));
            }
            if (policy.tokens) {
                json.tokens = policy.tokens.map(item => item.toWeight(policy.options));
            }
            if (policy.tree) {
                json.tree = policy.tree.toWeight(policy.options);
            }

            return json;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public static createHash(policy: PolicyModel): string {
        try {
            if (!policy) {
                return null;
            }
            const json = MessageComparator.createTree(policy);
            const sha256 = crypto
                .createHash('sha256')
                .update(JSON.stringify(json))
                .digest();
            return Hashing.base58.encode(sha256);
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}