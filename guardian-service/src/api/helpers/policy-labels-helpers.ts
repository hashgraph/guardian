import { DatabaseServer, PolicyLabel, SchemaConverterUtils, TopicConfig, TopicHelper, Users, VcDocument, VpDocument } from '@guardian/common';
import { GenerateUUIDv4, IOwner, IPolicyLabelConfig, PolicyType, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
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

export async function generateSchema(config: PolicyLabel, owner: IOwner) {
    const uuid = GenerateUUIDv4();
    const properties: any = {}
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
            ...properties
        },
        required: [],
        additionalProperties: false
    }
    const newSchema: any = {};
    newSchema.category = SchemaCategory.LABEL;
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
    newSchema.topicId = config.topicId;
    newSchema.creator = owner.creator;
    newSchema.owner = owner.owner;
    const schemaObject = DatabaseServer.createSchema(newSchema);
    SchemaHelper.setVersion(schemaObject, '1.0.0', null);
    SchemaHelper.updateIRI(schemaObject);
    return schemaObject;
}

export async function findRelationships(target: VcDocument | VpDocument): Promise<VcDocument[]> {
    if (!target) {
        return [];
    }

    const messageIds = new Set<string>();
    messageIds.add(target.messageId);

    const result: VcDocument[] = [];
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
    result: VcDocument[]
): Promise<VcDocument[]> {
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