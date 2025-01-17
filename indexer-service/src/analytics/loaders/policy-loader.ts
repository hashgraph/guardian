import { CompareOptions, IPolicyData } from '../compare/interfaces/index.js';
import { FileModel, PolicyModel, SchemaModel, TokenModel } from '../compare/index.js';

/**
 * Loader
 */
export class PolicyLoader {
    /**
     * Create model
     * @param data
     * @param options
     * @public
     * @static
     */
    public static async create(
        data: IPolicyData,
        options: CompareOptions
    ): Promise<PolicyModel> {
        //Policy
        const policyModel = PolicyModel.fromEntity(data.policy, options);

        //Schemas
        const schemaModels = data.schemas
            .map((schema) => SchemaModel.fromEntity(schema, data.policy, options));
        policyModel.setSchemas(schemaModels);

        //Tokens
        const tokenModels = data.tokens
            .map((token) => TokenModel.fromEntity(token, options));
        policyModel.setTokens(tokenModels);

        //Artifacts
        const artifactsModels = data.artifacts
            .map((artifact) => FileModel.fromEntity(artifact, options));
        policyModel.setArtifacts(artifactsModels);

        //Compare
        policyModel.update();

        return policyModel;
    }
}
