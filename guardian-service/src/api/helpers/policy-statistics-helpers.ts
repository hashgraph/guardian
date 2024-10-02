import { DatabaseServer, PolicyStatistic, SchemaConverterUtils, TopicConfig, TopicHelper, Users, VcDocument, VcHelper } from '@guardian/common';
import { GenerateUUIDv4, IFormulaData, IOwner, IRuleData, IScoreData, IScoreOption, IStatisticConfig, IVariableData, PolicyType, Schema, SchemaCategory, SchemaHelper, SchemaStatus, TopicType } from '@guardian/interfaces';
import { generateSchemaContext } from './schema-publish-helper.js';
import { createHash } from 'crypto';

export async function addRelationship(
    messageId: string,
    relationships: Set<string>
) {
    if (!messageId || relationships.has(messageId)) {
        return;
    }
    relationships.add(messageId);
    const doc = await DatabaseServer.getStatisticDocument({ messageId });
    if (doc && doc.relationships) {
        for (const id of doc.relationships) {
            await addRelationship(id, relationships);
        }
    }
}

export async function findRelationships(
    target: VcDocument,
    subDocs: VcDocument[],
): Promise<VcDocument[]> {
    const relationships = new Set<string>();
    relationships.add(target.messageId);
    if (target && target.relationships) {
        for (const id of target.relationships) {
            await addRelationship(id, relationships);
        }
    }
    return subDocs.filter((doc) => relationships.has(doc.messageId));
}

export async function generateSchema(config: PolicyStatistic, owner: IOwner) {
    const uuid = GenerateUUIDv4();
    const variables = config.config?.variables || [];
    const scores = config.config?.scores || [];
    const formulas = config.config?.formulas || [];
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
    newSchema.topicId = config.topicId;
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
    const didDocument = await vcHelper.loadDidDocument(owner.creator);
    const vcObject = await vcHelper.createVerifiableCredential(document, didDocument, null, null);
    return vcObject;
}

export async function getOrCreateTopic(item: PolicyStatistic): Promise<TopicConfig> {
    if (item.topicId) {
        const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.topicId), true);
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
    const topic = await topicHelper.create({
        type: TopicType.StatisticTopic,
        owner: policy.owner,
        name: 'POLICY_STATISTICS',
        description: 'POLICY_STATISTICS',
        policyId: policy.id,
        policyUUID: policy.uuid
    }, { admin: true, submit: false });
    await topic.saveKeys();
    await topicHelper.twoWayLink(topic, rootTopic, null);
    await DatabaseServer.saveTopic(topic.toObject());
    return topic;
}

function validateString(data: string): string {
    if (typeof data === 'string') {
        return data;
    } else {
        return '';
    }
}

function validateStringOrNumber(data: string | number): string | number {
    if (typeof data === 'string') {
        return data;
    } else if (typeof data === 'number') {
        return data;
    } else {
        return '';
    }
}

function validateBoolean(data: string | boolean): boolean {
    return data === 'true' || data === true;
}

function validateStrings(data?: string[]): string[] {
    const items: string[] = [];
    if (Array.isArray(data)) {
        for (const item of data) {
            items.push(validateString(item));
        }
    }
    return items;
}

function validateScoreOption(data: IScoreOption): IScoreOption {
    const formula: IScoreOption = {
        description: validateString(data.description),
        value: validateStringOrNumber(data.value)
    }
    return formula;
}

function validateScoreOptions(data: IScoreOption[]): IScoreOption[] {
    const options: IScoreOption[] = [];
    if (Array.isArray(data)) {
        for (const option of data) {
            options.push(validateScoreOption(option));
        }
    }
    return options;
}

function validateVariable(data?: IVariableData): IVariableData {
    const variable: IVariableData = {
        id: validateString(data.id),
        schemaId: validateString(data.schemaId),
        path: validateString(data.path),
        schemaName: validateString(data.schemaName),
        schemaPath: validateString(data.schemaPath),
        fieldType: validateString(data.fieldType),
        fieldRef: validateBoolean(data.fieldRef),
        fieldArray: validateBoolean(data.fieldArray),
        fieldDescription: validateString(data.fieldDescription),
        fieldProperty: validateString(data.fieldProperty),
        fieldPropertyName: validateString(data.fieldPropertyName),
    };
    return variable;
}

function validateScore(data?: IScoreData): IScoreData {
    const score: IScoreData = {
        id: validateString(data.id),
        type: validateString(data.type),
        description: validateString(data.description),
        relationships: validateStrings(data.relationships),
        options: validateScoreOptions(data.options)
    }
    return score;
}

function validateFormula(data?: IFormulaData): IFormulaData {
    const formula: IFormulaData = {
        id: validateString(data.id),
        type: validateString(data.type),
        description: validateString(data.description),
        formula: validateString(data.formula),
    }
    return formula;
}

function validateRule(data?: IRuleData): IRuleData {
    const rule: IRuleData = {
        schemaId: validateString(data.schemaId),
        type: validateString(data.type) as any,
        unique: validateBoolean(data.unique)
    }
    return rule;
}

function validateVariables(data?: IVariableData[]): IVariableData[] {
    const variables: IVariableData[] = [];
    if (Array.isArray(data)) {
        for (const variable of data) {
            variables.push(validateVariable(variable));
        }
    }
    return variables;
}

function validateScores(data?: IScoreData[]): IScoreData[] {
    const scores: IScoreData[] = [];
    if (Array.isArray(data)) {
        for (const score of data) {
            scores.push(validateScore(score));
        }
    }
    return scores;
}

function validateFormulas(data?: IFormulaData[]): IFormulaData[] {
    const formulas: IFormulaData[] = [];
    if (Array.isArray(data)) {
        for (const formula of data) {
            formulas.push(validateFormula(formula));
        }
    }
    return formulas;
}

function validateRules(data?: IRuleData[]): IRuleData[] {
    const rules: IRuleData[] = [];
    if (Array.isArray(data)) {
        for (const rule of data) {
            rules.push(validateRule(rule));
        }
    }
    return rules;
}

export function validateConfig(data: IStatisticConfig): IStatisticConfig {
    const config: IStatisticConfig = {
        variables: validateVariables(data?.variables),
        scores: validateScores(data?.scores),
        formulas: validateFormulas(data?.formulas),
        rules: validateRules(data?.rules),
    }
    return config;
}

function getSubject(document: VcDocument): any {
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
        console.log(item.size)
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