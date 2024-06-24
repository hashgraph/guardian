import { DatabaseServer, MessageServer, MessageType, PolicyImportExport, PolicyMessage, Users } from '@guardian/common';
import { CompareOptions, ISchemaData } from '../compare/interfaces/index.js';
import { SchemaModel } from '../compare/index.js';
import { IOwner } from '@guardian/interfaces';

export interface ILocalSchema {
    type: 'id',
    value: string
}

export interface IPolicySchema {
    type: 'policy-message',
    value: any,
    policy?: any
}

/**
 * Loader
 */
export class SchemaLoader {
    public static async loadById(schemaId: string): Promise<ISchemaData> {
        const schema = await DatabaseServer.getSchemaById(schemaId);
        const policy = await DatabaseServer.getPolicy({ topicId: schema?.topicId });
        return { schema, policy };
    }

    public static async loadByPolicy(
        schemaId: string,
        messageId: string,
        user: IOwner
    ): Promise<ISchemaData> {
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

    public static async load(
        schema: ILocalSchema | IPolicySchema,
        user: IOwner
    ): Promise<ISchemaData> {
        if (schema.type === 'id') {
            return await SchemaLoader.loadById(schema.value);
        } else if (schema.type === 'policy-message') {
            return await SchemaLoader.loadByPolicy(schema.value, schema.policy, user);
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
