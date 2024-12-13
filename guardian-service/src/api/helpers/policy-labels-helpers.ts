import { DatabaseServer, PolicyLabel, Schema, SchemaConverterUtils, TopicConfig, TopicHelper, Users, VcDocument, VpDocument } from '@guardian/common';
import { GenerateUUIDv4, INavItemConfig, IOwner, IPolicyLabelConfig, IRulesItemConfig, IStatisticItemConfig, NavItemType, PolicyType, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { generateSchemaContext } from './schema-publish-helper.js';
import { generateSchema as generateStatisticSchema } from './policy-statistics-helpers.js';

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
    schema: Schema
}[]> {
    console.log('generateSchema')
    const items = convertConfigToList([], config?.children);
    console.log('items', items.length);
    const nodes = items
        .filter((e) => e.type === NavItemType.Statistic || e.type === NavItemType.Rules) as (IRulesItemConfig | IStatisticItemConfig)[];
    console.log('nodes', nodes.length);
    const schemas: any[] = [];
    for (const node of nodes) {
        const schema = await generateStatisticSchema(topicId, node.config, owner);
        schemas.push({ node, schema });
    }
    console.log('schemas', schemas.length);
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