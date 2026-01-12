import { DatabaseServer, findBlocks, Formula, FormulaImportExport, FormulaMessage, INotificationStep, MessageAction, MessageServer, Policy, TopicConfig, VcDocument, VpDocument } from '@guardian/common';
import { EntityStatus, GenerateUUIDv4, IOwner, IRootConfig, PolicyStatus } from '@guardian/interfaces';

type IDocument = VcDocument | VpDocument;

async function findRelationships(target: IDocument): Promise<IDocument[]> {
    if (!target) {
        return [];
    }

    const prevRelationships = new Map<string, IDocument>();
    prevRelationships.set(target.messageId, target);

    await addRelationships(target, prevRelationships);

    return Array.from(prevRelationships.values());
}

async function addRelationships(doc: IDocument, relationships: Map<string, IDocument>) {
    if (doc && doc.relationships) {
        for (const id of doc.relationships) {
            await addRelationship(id, relationships);
        }
    }
}

async function addRelationship(messageId: string, relationships: Map<string, IDocument>) {
    if (!messageId || relationships.has(messageId)) {
        return;
    }
    const doc = await DatabaseServer.getVC({ messageId });
    relationships.set(messageId, doc);
    await addRelationships(doc, relationships);
}

function checkDocument(document: any, policyId: string, owner: IOwner): boolean {
    return (document.policyId === policyId);
}

export async function getFormulasData(
    policy: Policy,
    option: {
        policyId: string,
        schemaId: string,
        documentId: string,
        parentId: string
    },
    owner: IOwner
) {
    const { policyId, documentId, parentId } = option;

    const result: {
        document: IDocument | null,
        relationships: IDocument[]
    } = {
        document: null,
        relationships: []
    }

    const db = new DatabaseServer(policy.status === PolicyStatus.DRY_RUN ? policy.id : null);

    if (documentId) {
        const vc = await db.getVcDocument(documentId);
        if (vc) {
            result.document = vc;
            result.relationships = await findRelationships(vc);
        } else {
            const vp = await db.getVpDocument(documentId);
            if (vp) {
                result.document = vp;
                result.relationships = await findRelationships(vp);
            }
        }
    }

    if (parentId) {
        const doc = await db.getVcDocument(parentId);
        if (doc) {
            result.relationships = await findRelationships(doc);
        }
    }

    if (result.document) {
        if (!checkDocument(result.document, policyId, owner)) {
            result.document = null;
        }
    }

    if (result.relationships) {
        result.relationships = result.relationships.filter((doc) => checkDocument(doc, policyId, owner));
    }

    return result;
}

export async function publishFormula(
    item: Formula,
    owner: IOwner,
    root: IRootConfig,
    notifier: INotificationStep,
): Promise<Formula> {
    item.status = EntityStatus.PUBLISHED;

    // <-- Steps
    const STEP_RESOLVE_TOPIC = 'Resolve topic';
    const STEP_PUBLISH_FORMULA = 'Publish formula';
    // Steps -->

    notifier.addStep(STEP_RESOLVE_TOPIC, 30);
    notifier.addStep(STEP_PUBLISH_FORMULA, 70);
    notifier.start();

    notifier.startStep(STEP_RESOLVE_TOPIC);
    const topic = await TopicConfig.fromObject(await DatabaseServer.getTopicById(item.policyTopicId), true, owner.id);
    const messageServer = new MessageServer({
        operatorId: root.hederaAccountId,
        operatorKey: root.hederaAccountKey,
        signOptions: root.signOptions
    }).setTopicObject(topic);
    notifier.completeStep(STEP_RESOLVE_TOPIC);

    notifier.startStep(STEP_PUBLISH_FORMULA);
    const zip = await FormulaImportExport.generate(item);
    const buffer = await zip.generateAsync({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
            level: 3
        }
    });

    const publishMessage = new FormulaMessage(MessageAction.PublishFormula);
    publishMessage.setDocument(item, buffer);
    const statMessageResult = await messageServer
        .sendMessage(publishMessage, {
            sendToIPFS: true,
            memo: null,
            userId: owner.id,
            interception: owner.id
        });

    item.messageId = statMessageResult.getId();

    const result = await DatabaseServer.updateFormula(item);
    notifier.completeStep(STEP_PUBLISH_FORMULA);
    return result;
}

export function generateFormula(policy: Policy): any | null {
    const blocks = findBlocks(policy.config, (b) => b.blockType === 'mathBlock');
    const formulas: any[] = [];
    for (const block of blocks) {
        generateFormulaByBlock(block, formulas);
    }
    if (formulas.length) {
        return {
            policyId: policy.id,
            policyInstanceTopicId: policy.instanceTopicId,
            policyTopicId: policy.topicId,
            status: policy.status,
            config: {
                files: [],
                formulas
            }
        }
    } else {
        return null;
    }
}

function generateFormulaByBlock(block: any, result: any[]) {
    console.log(JSON.stringify(block, null, 4))

    try {
        const inputSchema = block.inputSchema;
        const outputSchema = block.outputSchema || inputSchema;
        const expression = block.expression;

        const items: any[] = [];
        // Variables
        if (Array.isArray(expression?.variables)) {
            for (const item of expression.variables) {
                items.push({
                    name: item.name,
                    type: 'variable',
                    uuid: GenerateUUIDv4(),
                    value: '',
                    description: block.tag,
                    link: {
                        entityId: inputSchema,
                        item: item.field,
                        type: 'schema'
                    }
                })
            }
        }
        // Formulas
        if (Array.isArray(expression?.formulas)) {
            for (const item of expression.formulas) {
                items.push({
                    description: block.tag,
                    name: item.name,
                    type: 'formula',
                    uuid: GenerateUUIDv4(),
                    value: item.body,
                    relationships: item.relationships
                })
            }
        }
        // Relationships
        for (const item of items) {
            const relationships: string[] = [];
            if (Array.isArray(item.relationships)) {
                for (const name of item.relationships) {
                    const link = items.find((e) => e.name === name);
                    if (link) {
                        relationships.push(link.uuid);
                    }
                }
            }
            item.relationships = relationships;
        }
        // Outputs
        if (Array.isArray(expression?.outputs)) {
            for (const item of expression.outputs) {
                let link = items.find((e) => e.name === item.name);
                if (link.type === 'variable') {
                    const relationships = [link.uuid];
                    link = {
                        description: block.tag,
                        name: item.name,
                        type: 'formula',
                        uuid: GenerateUUIDv4(),
                        value: item.name,
                        relationships
                    }
                    items.push(link);
                }
                link.link = {
                    entityId: outputSchema,
                    item: item.field,
                    type: 'schema'
                }
            }
        }

        for (const item of items) {
            result.push(item);
        }
        return result;
    } catch (error) {
        return;
    }
}