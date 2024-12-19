import {
    DatabaseServer,
    HederaDidDocument,
    PolicyLabel,
    VcHelper,
    TopicConfig,
    TopicHelper,
    Users,
    Schema as SchemaCollection,
    VcDocument as VcDocumentCollection,
    VpDocument as VpDocumentCollection,
    SchemaConverterUtils,
} from '@guardian/common';
import {
    GenerateUUIDv4,
    INavItemConfig,
    IOwner,
    IPolicyLabelConfig,
    IRulesItemConfig,
    IStatisticItemConfig,
    IStepDocument,
    NavItemType,
    PolicyType,
    Schema,
    SchemaCategory,
    SchemaHelper,
    SchemaStatus,
    TopicType
} from '@guardian/interfaces';
import { generateSchema as generateStatisticSchema } from './policy-statistics-helpers.js';
import { generateSchemaContext } from './schema-publish-helper.js';

export function publishLabelConfig(data?: IPolicyLabelConfig): IPolicyLabelConfig {
    return data;
}

export async function getOrCreateTopic(item: PolicyLabel): Promise<TopicConfig> {
    let topic: TopicConfig;
    if (item.topicId) {
        topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
        if (topic) {
            return topic;
        }
    }

    const policy = await DatabaseServer.getPolicyById(item.policyId);
    if (!policy || policy.status !== PolicyType.PUBLISH) {
        throw Error('Item does not exist.');
    }

    const rootTopic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(policy.instanceTopicId), true);
    const root = await (new Users()).getHederaAccount(item.owner);
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    topic = await topicHelper.create({
        type: TopicType.LabelTopic,
        owner: policy.owner,
        name: 'POLICY_LABELS',
        description: 'POLICY_LABELS',
        policyId: policy.id,
        policyUUID: policy.uuid
    }, { admin: true, submit: false });
    await topic.saveKeys();
    await topicHelper.twoWayLink(topic, rootTopic, null);
    await DatabaseServer.saveTopic(topic.toObject());
    return topic;
}

export async function generateSchema(
    topicId: string,
    config: IPolicyLabelConfig,
    owner: IOwner
): Promise<{
    node: any,
    schema: SchemaCollection
}[]> {
    if (!config) {
        return [];
    }
    const items = convertConfigToList([], config.children);
    const schemas: any[] = [];
    const groupSchema = await generateGroupSchema(topicId, 'Group', owner);
    schemas.push({ node: config, schema: groupSchema });
    for (const node of items) {
        if (node.type === NavItemType.Statistic) {
            const schema = await generateStatisticSchema(topicId, node.config, owner, false);
            schemas.push({ node, schema });
        }
        if (node.type === NavItemType.Rules) {
            const schema = await generateStatisticSchema(topicId, node.config, owner, true);
            schemas.push({ node, schema });
        }
        if (node.type === NavItemType.Group) {
            schemas.push({ node, schema: groupSchema });
        }
        if (node.type === NavItemType.Label) {
            schemas.push({ node, schema: groupSchema });
        }
    }
    return schemas;
}

function convertConfigToList(
    result: INavItemConfig[],
    items?: INavItemConfig[]
): INavItemConfig[] {
    if (Array.isArray(items)) {
        for (const item of items) {
            result.push(item);
            if (item.type === NavItemType.Group) {
                convertConfigToList(result, item.children);
            }
            if (item.type === NavItemType.Label) {
                convertConfigToList(result, item.config?.children);
            }
        }
    }
    return result;
}

export async function findRelationships(
    target: VcDocumentCollection | VpDocumentCollection
): Promise<VcDocumentCollection[]> {
    if (!target) {
        return [];
    }

    const messageIds = new Set<string>();
    messageIds.add(target.messageId);

    const result: VcDocumentCollection[] = [];
    if (Array.isArray(target.relationships)) {
        for (const relationship of target.relationships) {
            await findRelationshipsById(relationship, messageIds, result);
        }
    }

    return result;
}

export async function findRelationshipsById(
    messageId: string | undefined,
    map: Set<string>,
    result: VcDocumentCollection[]
): Promise<VcDocumentCollection[]> {
    if (!messageId || map.has(messageId)) {
        return result;
    }
    map.add(messageId);
    const doc = await DatabaseServer.getStatisticDocument({ messageId });
    if (doc) {
        result.push(doc);
        if (Array.isArray(doc.relationships)) {
            for (const relationship of doc.relationships) {
                await findRelationshipsById(relationship, map, result);
            }
        }
    }
    return result;
}

export async function generateVpDocument(
    documents: IStepDocument[],
    schemas: Schema[],
    owner: IOwner
) {
    const uuid = GenerateUUIDv4();
    const vcHelper = new VcHelper();
    const didDocument = await vcHelper.loadDidDocument(owner.creator);

    const vcObjects: any[] = [];
    for (const vc of documents) {
        const schemaObject = schemas.find((s) => s.iri === vc.schema);
        const vcObject = await generateVcDocument(vc.document, schemaObject, didDocument, vcHelper);
        vcObjects.push(vcObject);
    }

    const vpObject = await vcHelper.createVerifiablePresentation(
        vcObjects,
        didDocument,
        null,
        { uuid }
    );
    return vpObject;
}

export async function generateVcDocument(
    document: any,
    schema: Schema,
    didDocument: HederaDidDocument,
    vcHelper: VcHelper
) {
    document.id = GenerateUUIDv4();
    if (schema) {
        document = SchemaHelper.updateObjectContext(schema, document);
    }

    const res = await vcHelper.verifySubject(document);
    if (!res.ok) {
        throw Error(JSON.stringify(res.error));
    }

    const vcObject = await vcHelper.createVerifiableCredential(document, didDocument, null, null);
    return vcObject;
}

export async function generateGroupSchema(topicId: string, type: string, owner: IOwner) {
    const uuid = type;
    const document: any = {
        $id: `#${uuid}`,
        $comment: `{ "term": "${uuid}", "@id": "#${uuid}" }`,
        title: `${uuid}`,
        description: `${uuid}`,
        type: 'object',
        properties: {
            '@context': {
                oneOf: [{
                    type: 'string'
                }, {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }],
                readOnly: true
            },
            type: {
                oneOf: [{
                    type: 'string'
                }, {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }],
                readOnly: true
            },
            id: {
                type: 'string',
                readOnly: true
            },
            status: {
                type: 'boolean',
                readOnly: true
            }
        },
        required: [],
        additionalProperties: false
    }
    const newSchema: any = {};
    newSchema.category = SchemaCategory.STATISTIC;
    newSchema.readonly = true;
    newSchema.system = false;
    newSchema.uuid = uuid
    newSchema.status = SchemaStatus.PUBLISHED;
    newSchema.document = document;
    newSchema.context = generateSchemaContext(newSchema);
    newSchema.iri = `${uuid}`;
    newSchema.codeVersion = SchemaConverterUtils.VERSION;
    newSchema.documentURL = `schema:${uuid}`;
    newSchema.contextURL = `schema:${uuid}`;
    newSchema.topicId = topicId;
    newSchema.creator = owner.creator;
    newSchema.owner = owner.owner;
    const schemaObject = DatabaseServer.createSchema(newSchema);
    SchemaHelper.setVersion(schemaObject, '1.0.0', null);
    SchemaHelper.updateIRI(schemaObject);
    return schemaObject;
}
