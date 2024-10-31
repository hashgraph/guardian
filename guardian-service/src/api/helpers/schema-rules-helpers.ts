import { DatabaseServer, SchemaRule, VcDocument } from '@guardian/common';
import { IOwner, ISchemaRulesConfig } from '@guardian/interfaces';

export function publishRuleConfig(data?: ISchemaRulesConfig): ISchemaRulesConfig {
    if (data) {
        const schemas = new Set<string>();
        if (data.fields) {
            for (const field of data.fields) {
                schemas.add(field.schemaId);
            }
        }
        data.schemas = Array.from(schemas);
    }
    return data;
}

async function findRelationships(target: VcDocument): Promise<VcDocument[]> {
    if (!target) {
        return [];
    }

    const prevRelationships = new Map<string, VcDocument>();
    prevRelationships.set(target.messageId, target);

    await addPrevRelationships(target, prevRelationships);

    return Array.from(prevRelationships.values());
}

async function addPrevRelationships(doc: VcDocument, relationships: Map<string, VcDocument>) {
    if (doc && doc.relationships) {
        for (const id of doc.relationships) {
            await addPrevRelationship(id, relationships);
        }
    }
}

async function addPrevRelationship(messageId: string, relationships: Map<string, VcDocument>) {
    if (!messageId || relationships.has(messageId)) {
        return;
    }
    const doc = await DatabaseServer.getVC({ messageId });
    relationships.set(messageId, doc);
    await addPrevRelationships(doc, relationships);
}

export async function getSchemaRuleData(
    rules: SchemaRule,
    option: {
        policyId: string,
        schemaId: string,
        documentId: string,
        parentId: string
    },
    owner: IOwner
) {
    const { policyId, schemaId, documentId, parentId } = option;

    const result: {
        rules: SchemaRule,
        document: VcDocument | null,
        relationships: VcDocument[]
    } = {
        rules,
        document: null,
        relationships: []
    }

    const schemas = rules?.config?.schemas;

    if (!schemas || !schemas.includes(schemaId) || schemas.length < 2) {
        return result;
    }

    if (documentId) {
        const doc = await DatabaseServer.getVCById(documentId);
        if (doc) {
            result.document = doc;
            result.relationships = await findRelationships(doc);
        }
    }
    if (parentId) {
        const doc = await DatabaseServer.getVCById(parentId);
        if (doc) {
            result.relationships = await findRelationships(doc);
        }
    }

    if (
        !result.document ||
        result.document.owner !== owner.creator ||
        result.document.policyId !== policyId
    ) {
        result.document = null;
    }

    if (result.relationships) {
        result.relationships = result.relationships.filter((doc) => (
            doc.owner === owner.creator &&
            doc.policyId === policyId &&
            schemas.includes(doc.schema)
        ));
    } else {
        result.relationships = [];
    }

    return result;
}