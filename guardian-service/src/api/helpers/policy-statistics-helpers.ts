import { DatabaseServer, PolicyStatistic, SchemaConverterUtils, TopicConfig, TopicHelper, Users, VcDocument, VcHelper } from '@guardian/common';
import { GenerateUUIDv4, IOwner, IStatisticConfig, PolicyStatus, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { generateSchemaContext } from '../../helpers/import-helpers/index.js';

export async function addPrevRelationships(doc: VcDocument, relationships: Set<string>) {
    if (doc && doc.relationships) {
        for (const id of doc.relationships) {
            await addPrevRelationship(id, relationships);
        }
    }
}

export async function addPrevRelationship(messageId: string, relationships: Set<string>) {
    if (!messageId || relationships.has(messageId)) {
        return;
    }
    relationships.add(messageId);
    const doc = await DatabaseServer.getStatisticDocument({ messageId }, {
        fields: ['id', 'messageId', 'relationships']
    });
    await addPrevRelationships(doc, relationships);
}

export async function addNextRelationships(relationships: Set<string>) {
    const docs = await DatabaseServer.getStatisticDocuments({
        relationships: { $in: Array.from(relationships) }
    }, {
        fields: ['id', 'messageId', 'relationships']
    });
    const count = relationships.size;
    for (const doc of docs) {
        if (doc.messageId) {
            relationships.add(doc.messageId);
        }
    }
    if (relationships.size > count) {
        await addNextRelationships(relationships);
    }
}

export async function findRelationships(
    target: VcDocument,
    subDocs: VcDocument[],
): Promise<VcDocument[]> {
    if (!target) {
        return [];
    }

    const prevRelationships = new Set<string>();
    prevRelationships.add(target.messageId);

    const nextRelationships = new Set<string>();
    nextRelationships.add(target.messageId);

    await addPrevRelationships(target, prevRelationships);
    await addNextRelationships(nextRelationships);

    return subDocs.filter((doc) => prevRelationships.has(doc.messageId) || nextRelationships.has(doc.messageId));
}

export async function generateSchema(
    topicId: string,
    config: IStatisticConfig,
    owner: IOwner,
    rules: boolean = false
) {
    const uuid = GenerateUUIDv4();
    const variables = config?.variables || [];
    const scores = config?.scores || [];
    const formulas = config?.formulas || [];
    const properties: any = {}
    for (const variable of variables) {
        properties[variable.id] = {
            $comment: `{"term": "${variable.id}", "@id": "https://www.schema.org/text"}`,
            title: variable.id,
            description: variable.fieldDescription,
            oneOf: [{
                type: variable.fieldType,
            }, {
                type: 'array',
                items: {
                    type: variable.fieldType,
                }
            }],
            readOnly: false
        }
    }
    for (const score of scores) {
        properties[score.id] = {
            $comment: `{"term": "${score.id}", "@id": "https://www.schema.org/text"}`,
            title: score.id,
            description: score.description,
            oneOf: [{
                type: score.type || 'string'
            }, {
                type: 'array',
                items: {
                    type: score.type || 'string'
                }
            }],
            readOnly: false
        }
    }
    for (const formula of formulas) {
        properties[formula.id] = {
            $comment: `{"term": "${formula.id}", "@id": "https://www.schema.org/text"}`,
            title: formula.id,
            description: formula.description,
            oneOf: [{
                type: formula.type || 'string'
            }, {
                type: 'array',
                items: {
                    type: formula.type || 'string'
                }
            }],
            readOnly: false
        }
    }
    if (rules) {
        properties.status = {
            $comment: `{"term": "status", "@id": "https://www.schema.org/text"}`,
            title: 'status',
            description: 'Status',
            type: 'boolean',
            readOnly: false
        }
    }
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

export async function generateVcDocument(document: any, schema: Schema, owner: IOwner): Promise<any> {
    document.id = GenerateUUIDv4();
    if (schema) {
        document = SchemaHelper.updateObjectContext(schema, document);
    }
    const vcHelper = new VcHelper();
    const res = await vcHelper.verifySubject(document);
    if (!res.ok) {
        throw Error(JSON.stringify(res.error));
    }
    const didDocument = await vcHelper.loadDidDocument(owner.creator, owner.id);
    const vcObject = await vcHelper.createVerifiableCredential(document, didDocument, null, null);
    return vcObject;
}

export async function getOrCreateTopic(item: PolicyStatistic, userId: string | null): Promise<TopicConfig> {
    let topic: TopicConfig;
    if (item.topicId) {
        topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true, userId);
        if (topic) {
            return topic;
        }
    }

    const policy = await DatabaseServer.getPolicyById(item.policyId);
    if (!policy || policy.status !== PolicyStatus.PUBLISH) {
        throw Error('Item does not exist.');
    }

    const rootTopic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(policy.instanceTopicId), true, userId);
    const root = await (new Users()).getHederaAccount(item.owner, userId);
    const topicHelper = new TopicHelper(root.hederaAccountId, root.hederaAccountKey, root.signOptions);
    topic = await topicHelper.create({
        type: TopicType.StatisticTopic,
        owner: policy.owner,
        name: 'POLICY_STATISTICS',
        description: 'POLICY_STATISTICS',
        policyId: policy.id,
        policyUUID: policy.uuid
    }, userId, { admin: true, submit: false });
    await topic.saveKeys(userId);
    await topicHelper.twoWayLink(topic, rootTopic, null, userId);
    await DatabaseServer.saveTopic(topic.toObject());
    return topic;
}

export function publishConfig(data?: IStatisticConfig): IStatisticConfig {
    const rules = data?.rules || [];
    const variables = data?.variables || [];
    const schemas = new Set<string>();
    for (const variable of variables) {
        schemas.add(variable.schemaId);
    }
    data.rules = rules.filter((r) => schemas.has(r.schemaId));
    return data;
}

export function getSubject(document: VcDocument): any {
    let credentialSubject: any = document?.document?.credentialSubject;
    if (Array.isArray(credentialSubject)) {
        credentialSubject = credentialSubject[0];
    }
    if (credentialSubject && credentialSubject.id) {
        return credentialSubject;
    }
    return document;
}

function getVcHash(document: VcDocument): string {
    return document.schema;
}

export function uniqueDocuments(documents: VcDocument[]): VcDocument[] {
    const map = new Map<string, Map<string, any>>();
    for (const document of documents) {
        const hash = getVcHash(document);
        const item = map.get(hash) || (new Map<string, any>());
        item.set(document.messageId, document);
        map.set(hash, item);
    }
    const result: VcDocument[] = [];
    for (const item of map.values()) {
        for (const doc of item.values()) {
            if (Array.isArray(doc.relationships)) {
                for (const messageId of doc.relationships) {
                    const old = item.get(messageId);
                    if (old) {
                        old.__duplicate = true
                    }
                }
            }
        }
        for (const doc of item.values()) {
            if (!doc.__duplicate) {
                result.push(doc);
            }
        }
    }
    return result;
}
