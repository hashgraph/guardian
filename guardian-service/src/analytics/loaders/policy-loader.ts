import { DatabaseServer, ImportExportUtils, MessageServer, MessageType, PolicyImportExport, PolicyMessage, Users } from '@guardian/common';
import { IOwner } from '@guardian/interfaces';
import { CompareOptions, IArtifactRawData, IPolicyData } from '../compare/interfaces/index.js';
import { FileModel, PolicyModel, SchemaModel, TokenModel } from '../compare/index.js';

export interface ILocalPolicy {
    type: 'id',
    value: string
}

export interface IPolicyMessage {
    type: 'message',
    value: string
}

export interface IPolicyFile {
    type: 'file',
    value: {
        id: string,
        name: string,
        value: string
    }
}

export interface IAnyPolicy {
    type: 'id' | 'file' | 'message',
    value: string | {
        id: string,
        name: string,
        value: string
    }
}

/**
 * Loader
 */
export class PolicyLoader {
    public static async load(policyId: string): Promise<IPolicyData>
    public static async load(policy: IAnyPolicy, user: IOwner): Promise<IPolicyData>
    public static async load(policy: IAnyPolicy | string, user?: IOwner): Promise<IPolicyData> {
        if (typeof policy === 'string') {
            return await PolicyLoader.loadById({ type: 'id', value: policy });
        } else {
            if (policy.type === 'id') {
                return await PolicyLoader.loadById(policy as ILocalPolicy);
            } else if (policy.type === 'file') {
                return await PolicyLoader.loadByFile(policy as IPolicyFile);
            } else if (policy.type === 'message') {
                return await PolicyLoader.loadByMessage(policy as IPolicyMessage, user);
            } else {
                throw new Error('Unknown policy');
            }
        }
    }

    private static async loadById(item: ILocalPolicy): Promise<IPolicyData> {
        const policyId = item.value;

        //Policy
        const policy = await DatabaseServer.getPolicyById(policyId);

        //Schemas
        const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });

        //Tokens
        const tokenIds = ImportExportUtils.findAllTokens(policy.config);
        const tokens = await DatabaseServer.getTokens({ tokenId: { $in: tokenIds } });

        //Artifacts
        const artifacts: IArtifactRawData[] = [];
        const files = await DatabaseServer.getArtifacts({ policyId });
        for (const artifact of files) {
            const buffer = await DatabaseServer.getArtifactFileByUUID(artifact.uuid);
            artifacts.push({
                uuid: artifact.uuid,
                name: artifact.name,
                extention: artifact.extention,
                data: buffer
            });
        }

        return { policy, schemas, tokens, artifacts, type: 'id' };
    }

    private static async loadByFile(item: IPolicyFile): Promise<IPolicyData> {
        const file = item.value;
        if (!file) {
            throw new Error('File is empty');
        }

        const result = await PolicyImportExport.parseZipFile(Buffer.from(file.value, 'base64'), true);
        result.policy.id = file.id;
        return { ...result, type: 'file' };
    }

    private static async loadByMessage(item: IPolicyMessage, user: IOwner): Promise<IPolicyData> {
        const messageId = item.value;
        if (!messageId) {
            throw new Error('Policy ID in body is empty');
        }

        const users = new Users()
        const root = await users.getHederaAccount(user.creator);
        const userAccount = await users.getUser(user.username);

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
        const message = await messageServer.getMessage<PolicyMessage>(messageId, null, userAccount.id.toString());
        if (message.type !== MessageType.InstancePolicy) {
            throw new Error('Invalid Message Type');
        }

        if (!message.document) {
            throw new Error('file in body is empty');
        }

        const result = await PolicyImportExport.parseZipFile(message.document, true);
        result.policy.id = messageId;
        return { ...result, type: 'message' };
    }

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
        policyModel.setType(data.type);
        policyModel.update();

        return policyModel;
    }
}
