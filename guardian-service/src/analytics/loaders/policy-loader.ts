import { DatabaseServer, ImportExportUtils, MessageServer, MessageType, PolicyImportExport, PolicyMessage, Users } from "@guardian/common";
import { IOwner } from "@guardian/interfaces";
import { IArtifactRawData, IPolicyData } from "../compare/interfaces/raw-data.interface";

export interface ILocalPolicy {
    type: 'id',
    value: string
}

export interface IPolicyFile {
    type: 'file',
    value: any
}

export interface IPolicyMessage {
    type: 'message',
    value: string
}

/**
 * Loader
 */
export class PolicyLoader {
    public static async load(
        policy: ILocalPolicy | IPolicyFile | IPolicyMessage,
        user: IOwner
    ) {
        if (policy.type === 'id') {
            return await PolicyLoader.loadById(policy.value);
        } else if (policy.type === 'file') {
            return await PolicyLoader.loadByFile(policy.value);
        } else if (policy.type === 'message') {
            return await PolicyLoader.loadByMessage(policy.value, user);
        } else {
            throw new Error('Unknown policy');
        }
    }

    public static async loadById(
        policyId: string
    ): Promise<IPolicyData> {
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

        return { policy, schemas, tokens, artifacts };
    }

    public static async loadByFile(
        zip: any
    ): Promise<IPolicyData> {
        const result = await PolicyImportExport.parseZipFile(Buffer.from(zip.data), true);
        result.policy.id = 'file';
        return result;
    }

    public static async loadByMessage(
        messageId: string,
        user: IOwner
    ): Promise<IPolicyData> {
        if (!messageId) {
            throw new Error('Policy ID in body is empty');
        }

        const users = new Users()
        const root = await users.getHederaAccount(user.creator);

        const messageServer = new MessageServer(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
        const message = await messageServer.getMessage<PolicyMessage>(messageId);
        if (message.type !== MessageType.InstancePolicy) {
            throw new Error('Invalid Message Type');
        }

        if (!message.document) {
            throw new Error('file in body is empty');
        }

        const result = await PolicyImportExport.parseZipFile(message.document, true);
        result.policy.id = messageId;
        return result;
    }
}
