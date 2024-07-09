import { DatabaseServer, MessageServer, MessageType, PolicyImportExport, PolicyMessage, Users } from '@guardian/common';
import { CompareOptions, ISchemaData } from '../compare/interfaces/index.js';
import { SchemaModel } from '../compare/index.js';
import { IOwner } from '@guardian/interfaces';

export interface ILocalSchema {
    type: 'id',
    value: string
}

export interface IPolicyMessageSchema {
    type: 'policy-message',
    value: any,
    policy: string
}

export interface IPolicyFileSchema {
    type: 'policy-file',
    value: any,
    policy: {
        id: string,
        name: string,
        value: string
    }
}

export interface IAnySchema {
    type: 'id' | 'policy-message' | 'policy-file',
    value: string,
    policy?: string | {
        id: string,
        name: string,
        value: string
    }
}

/**
 * Loader
 */
export class SchemaLoader {
    public static async loadById(item: ILocalSchema): Promise<ISchemaData> {
        const schema = await DatabaseServer.getSchemaById(item.value);
        const policy = await DatabaseServer.getPolicy({ topicId: schema?.topicId });
        return { schema, policy };
    }

    public static async loadByPolicyMessage(item: IPolicyMessageSchema, user: IOwner): Promise<ISchemaData> {
        const messageId = item.policy;
        const schemaId = item.value;
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

        const { policy, schemas } = await PolicyImportExport.parseZipFile(message.document, true);
        const schema = schemas.find((e) => e.iri === schemaId);
        if (policy) {
            policy.id = messageId;
        }
        if (schema) {
            schema.id = schema.messageId || schema.iri;
        }
        return { policy, schema };
    }

    public static async loadByPolicyFile(item: IPolicyFileSchema): Promise<ISchemaData> {
        const file = item.policy;
        const schemaId = item.value;

        if (!file) {
            throw new Error('File is empty');
        }

        const { policy, schemas } = await PolicyImportExport.parseZipFile(Buffer.from(file.value, 'base64'), true);
        const schema = schemas.find((e) => e.iri === schemaId);
        if (policy) {
            policy.id = file.id;
        }
        if (schema) {
            schema.id = schema.messageId || schema.iri;
        }
        return { policy, schema };
    }

    public static async load(
        schema: IAnySchema,
        user: IOwner
    ): Promise<ISchemaData> {
        if (schema.type === 'id') {
            return await SchemaLoader.loadById(schema as ILocalSchema);
        } else if (schema.type === 'policy-message') {
            return await SchemaLoader.loadByPolicyMessage(schema as IPolicyMessageSchema, user);
        } else if (schema.type === 'policy-file') {
            return await SchemaLoader.loadByPolicyFile(schema as IPolicyFileSchema);
        } else {
            throw new Error('Unknown policy');
        }
    }

    /**
     * Create tool model
     * @param data
     * @param options
     * @public
     * @static
     */
    public static async create(data: ISchemaData, options: CompareOptions): Promise<SchemaModel> {
        const model = new SchemaModel(data.schema, options);
        model.setPolicy(data.policy);
        model.update(options);
        return model;
    }
}
