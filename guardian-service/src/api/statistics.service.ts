import { ApiResponse } from './helpers/api-response.js';
import { DatabaseServer, MessageAction, MessageError, MessageResponse, MessageServer, PinoLogger, PolicyImportExport, PolicyStatistic, SchemaConverterUtils, VcDocument, VcHelper } from '@guardian/common';
import { EntityStatus, GenerateUUIDv4, IOwner, ISchema, MessageAPI, PolicyType, Schema, SchemaCategory, SchemaHelper, SchemaStatus } from '@guardian/interfaces';
import { generateSchemaContext, publishSchema } from './helpers/index.js';

async function addRelationship(
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

async function findRelationships(
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

function getVcId(document: VcDocument): string {
    let credentialSubject: any = document?.document?.credentialSubject;
    if (Array.isArray(credentialSubject)) {
        credentialSubject = credentialSubject[0];
    }
    if (credentialSubject && credentialSubject.id) {
        return credentialSubject.id;
    }
    return document.id;
}

function uniqueDocuments(documents: VcDocument[]): VcDocument[] {
    const map = new Map<string, VcDocument>();
    for (const document of documents) {
        const id = getVcId(document);
        map.set(id, document);
    }
    return Array.from(map.values());
}

async function generateSchema(config: PolicyStatistic) {
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
            type: variable.fieldType,
            readOnly: false
        }
    }
    for (const score of scores) {
        properties[score.id] = {
            $comment: `{"term": "${score.id}", "@id": "https://www.schema.org/text"}`,
            title: score.id,
            description: score.description,
            type: 'string',
            readOnly: false
        }
    }
    for (const formula of formulas) {
        properties[formula.id] = {
            $comment: `{"term": "${formula.id}", "@id": "https://www.schema.org/text"}`,
            title: formula.id,
            description: formula.description,
            type: 'string',
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
    const schemaObject = DatabaseServer.createSchema(newSchema);
    SchemaHelper.setVersion(schemaObject, null, null);
    SchemaHelper.updateIRI(schemaObject);
    const savedSchema = await DatabaseServer.saveSchema(schemaObject);
    return savedSchema;
}

async function generateVcDocument(document: any, schema: Schema, owner: IOwner): Promise<any> {
    document.id = GenerateUUIDv4();
    if (schema) {
        document = SchemaHelper.updateObjectContext(schema, document);
    }
    const vcHelper = new VcHelper();
    const res = await vcHelper.verifySubject(document);
    if (!res.ok) {
        throw Error(JSON.stringify(res.error));
    }
    console.log(1, document)
    const didDocument = await vcHelper.loadDidDocument(owner.creator);
    const vcObject = await vcHelper.createVerifiableCredential(document, didDocument, null, null);
    console.log(2, vcObject)
    return vcObject;
}

/**
 * Connect to the message broker methods of working with statistics.
 */
export async function statisticsAPI(logger: PinoLogger): Promise<void> {
    /**
     * Create new statistic
     *
     * @param payload - statistic
     *
     * @returns {any} new statistic
     */
    ApiResponse(MessageAPI.CREATE_STATISTIC,
        async (msg: { statistic: PolicyStatistic, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { statistic, owner } = msg;

                if (!statistic) {
                    return new MessageError('Invalid object.');
                }

                const policyId = statistic.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }

                delete statistic._id;
                delete statistic.id;
                delete statistic.status;
                delete statistic.owner;
                delete statistic.messageId;
                statistic.creator = owner.creator;
                statistic.owner = owner.owner;
                statistic.status = EntityStatus.DRAFT;
                const row = await DatabaseServer.createStatistic(statistic);
                return new MessageResponse(row);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get statistics
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTICS,
        async (msg: { filters: any, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { filters, owner } = msg;
                const { pageIndex, pageSize } = filters;

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }
                otherOptions.fields = [
                    'id',
                    'creator',
                    'owner',
                    'name',
                    'description',
                    'status',
                    'topicId',
                    'messageId',
                    'policyId'
                ];
                const [items, count] = await DatabaseServer.getStatisticsAndCount(
                    {
                        owner: owner.owner
                    },
                    otherOptions
                );
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get statistic
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                return new MessageResponse(item);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get relationships
     *
     * @param {any} msg - statistic id
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_RELATIONSHIPS,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                const policyId = item.policyId;
                const policy = await DatabaseServer.getPolicyById(policyId);
                if (!policy || policy.status !== PolicyType.PUBLISH) {
                    return new MessageError('Item does not exist.');
                }
                const { schemas, toolSchemas } = await PolicyImportExport.loadAllSchemas(policy);
                const all = [].concat(schemas, toolSchemas).filter((s) => s.status === SchemaStatus.PUBLISHED)
                return new MessageResponse({
                    policy,
                    schemas: all
                });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Update theme
     *
     * @param payload - theme
     *
     * @returns {Theme} theme
     */
    ApiResponse(MessageAPI.UPDATE_STATISTIC,
        async (msg: { id: string, statistic: PolicyStatistic, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, statistic, owner } = msg;

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }

                item.name = statistic.name;
                item.description = statistic.description;
                item.method = statistic.method;
                item.config = statistic.config;

                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Delete statistics
     *
     * @param {any} msg - statistic id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.DELETE_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                await DatabaseServer.removeStatistic(item);
                return new MessageResponse(true);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Publish statistic
     *
     * @param {any} msg - statistic id
     *
     * @returns {boolean} - Operation success
     */
    ApiResponse(MessageAPI.PUBLISH_STATISTIC,
        async (msg: { id: string, owner: IOwner }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner } = msg;

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                if (item.status === EntityStatus.PUBLISHED) {
                    return new MessageError(`Item already published`);
                }
                item.status = EntityStatus.PUBLISHED;

                const result = await DatabaseServer.updateStatistic(item);
                return new MessageResponse(result);

            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Get documents
     *
     * @param {any} msg - filters
     *
     * @returns {any} - Operation success
     */
    ApiResponse(MessageAPI.GET_STATISTIC_DOCUMENTS,
        async (msg: {
            id: string,
            owner: IOwner,
            pageIndex?: string,
            pageSize?: string
        }) => {
            try {

                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, owner, pageIndex, pageSize } = msg;

                const otherOptions: any = {};
                const _pageSize = parseInt(pageSize, 10);
                const _pageIndex = parseInt(pageIndex, 10);
                if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = _pageSize;
                    otherOptions.offset = _pageIndex * _pageSize;
                } else {
                    otherOptions.orderBy = { createDate: 'DESC' };
                    otherOptions.limit = 100;
                }

                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }

                const policyId: string = item.policyId;
                const rules = item.config?.rules || [];
                const targets = rules.filter((r) => r.type === 'main');
                const sub = rules.filter((r) => r.type === 'related');
                const all = rules.filter((r) => r.type === 'unrelated');

                const targetSchemas = targets.map((r) => r.schemaId);
                const subSchemas = sub.map((r) => r.schemaId);
                const allSchemas = all.map((r) => r.schemaId);

                const allDocs = uniqueDocuments(await DatabaseServer.getStatisticDocuments({
                    policyId,
                    owner: owner.creator,
                    schema: { $in: allSchemas }
                }));

                const subDocs = uniqueDocuments(await DatabaseServer.getStatisticDocuments({
                    policyId,
                    owner: owner.creator,
                    schema: { $in: subSchemas }
                }));

                const [targetDocs, count] = await DatabaseServer.getStatisticDocumentsAndCount(
                    {
                        policyId,
                        owner: owner.creator,
                        schema: { $in: targetSchemas }
                    },
                    otherOptions
                );

                const items: any[] = [];
                for (const target of uniqueDocuments(targetDocs)) {
                    items.push({
                        targetDocument: target,
                        relatedDocuments: await findRelationships(target, subDocs),
                        unrelatedDocuments: allDocs
                    })
                }
                return new MessageResponse({ items, count });
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });

    /**
     * Create new statistic report
     *
     * @param payload - statistic report
     *
     * @returns {any} new statistic report
     */
    ApiResponse(MessageAPI.CREATE_STATISTIC_REPORT,
        async (msg: {
            id: string, report: {
                document: any,
                target: string,
                relationships: string[]
            }, owner: IOwner
        }) => {
            try {
                if (!msg) {
                    return new MessageError('Invalid parameters');
                }
                const { id, report, owner } = msg;

                if (!report || !report.document) {
                    return new MessageError('Invalid object.');
                }
                const item = await DatabaseServer.getStatisticById(id);
                if (!item || item.owner !== owner.owner) {
                    return new MessageError('Item does not exist.');
                }
                // if (item.status !== EntityStatus.PUBLISHED) {
                //     return new MessageError('Item is not published.');
                // }

                const schema = await generateSchema(item);
                const schemaObject = new Schema(schema);
                const vc = await generateVcDocument(report.document, schemaObject, owner)

                const newItem = {
                    statisticId: item.id,
                    policyId: item.policyId,
                    creator: owner.creator,
                    owner: owner.owner,
                    target: report.target,
                    relationships: report.relationships,
                    document: vc.toJsonTree(),
                    schema: schema
                }
                // const row = await DatabaseServer.createStatisticReport(newItem);
                return new MessageResponse(newItem);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE']);
                return new MessageError(error);
            }
        });
}