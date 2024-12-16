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
    SchemaHelper,
    TopicType
} from '@guardian/interfaces';
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
    schema: SchemaCollection
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