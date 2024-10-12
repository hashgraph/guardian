import {
    DataBaseHelper,
    Message,
    Analytics,
    ProjectCoordinates,
} from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import {
    MessageType,
    MessageAction,
    IPFS_CID_PATTERN,
} from '@indexer/interfaces';

export function schemaHasGeoJson(context) {
    return context['@context']
        ? !!context['@context']['#GeoJSON']
        : !!context['#GeoJSON'];
}

export function findGeoJsonFields(context: any, result = {}) {
    context = context['@context'] || context;
    if (!context) {
        return result;
    }
    // tslint:disable-next-line:forin
    for (const schema of Object.keys(context)) {
        result[schema] = [];
        safetyRunning(() => {
            for (const field of Object.keys(context[schema]['@context'])) {
                safetyRunning(() => {
                    if (
                        context[schema]['@context'][field]['@id'].indexOf(
                            '#GeoJSON'
                        ) > -1
                    ) {
                        result[schema].push(field);
                    }
                });
            }
        });
    }
    return result;
}

export function findGeoJSONFieldsInDocument(cs, map, result = []) {
    if (map[cs.type] && cs[map[cs.type]]) {
        const fields = map[cs.type];
        for (const field of fields) {
            result.push(cs[field]);
        }
    } else {
        for (const field in cs) {
            if (
                Object.prototype.toString.call(cs[field]) === '[object Object]'
            ) {
                findGeoJSONFieldsInDocument(cs[field], map, result);
            }
        }
    }
    return result;
}

async function addCoordinates(
    em,
    item: { type: string; coordinates: any[] },
    projectId: string
) {
    switch (item.type) {
        case 'Point': {
            await em.persist(
                em.create(ProjectCoordinates, {
                    coordinates: `${item.coordinates[0].toString(
                        10
                    )}|${item.coordinates[1].toString(10)}`,
                    projectId,
                })
            );
            break;
        }
        case 'MultiPoint':
        case 'LineString': {
            for (const point of item.coordinates) {
                await addCoordinates(
                    em,
                    { type: 'Point', coordinates: point },
                    projectId
                );
            }
            break;
        }
        case 'Polygon':
        case 'MultiLineString': {
            for (const line of item.coordinates) {
                await addCoordinates(
                    em,
                    { type: 'MultiPoint', coordinates: line },
                    projectId
                );
            }
            break;
        }
        case 'MultiPolygon': {
            for (const polygon of item.coordinates) {
                await addCoordinates(
                    em,
                    { type: 'Polygon', coordinates: polygon },
                    projectId
                );
            }
            break;
        }
        default:
            break;
    }
    await em;
}

async function checkForGeoJson(em, document, schemaContext, projectId) {
    if (schemaHasGeoJson(schemaContext)) {
        const getJsonFields = findGeoJsonFields(schemaContext);
        await Promise.all(
            findGeoJSONFieldsInDocument(
                Array.isArray(document.credentialSubject)
                    ? document.credentialSubject[0]
                    : document.credentialSubject,
                getJsonFields
            ).map(async (item) => {
                if (Array.isArray(item)) {
                    await Promise.all(
                        item.map(async (arrayItem) => {
                            await addCoordinates(em, arrayItem, projectId);
                        })
                    );
                } else {
                    await addCoordinates(em, item, projectId);
                }
            })
        );
        await em.flush();
    }
}

async function syncProjectLocations() {
    const em = DataBaseHelper.getEntityManager();
    const projectLocations = await em
        .getCollection('project_coordinates')
        .distinct('projectId');
    const documents = await em.getCollection('message').find({
        type: MessageType.VC_DOCUMENT,
        action: MessageAction.CreateVC,
        consensusTimestamp: { $nin: projectLocations },
    });
    let index = 0;
    const count = await documents.count();
    while (await documents.hasNext()) {
        index++;
        console.log(`Sync project coordinates: ${index}/${count}`);
        const document = await documents.next();
        if (!Array.isArray(document.files) || document.files.length === 0) {
            continue;
        }
        await safetyRunning(async () => {
            for (const file of document.files) {
                await safetyRunning(async () => {
                    const documentFileString = await DataBaseHelper.loadFile(
                        file
                    );
                    const documentFile = JSON.parse(documentFileString);
                    if (!documentFile.credentialSubject) {
                        return;
                    }
                    let contexts = documentFile['@context'];
                    contexts = Array.isArray(contexts) ? contexts : [contexts];
                    for (const context of contexts) {
                        if (typeof context === 'string') {
                            const matches = context?.match(IPFS_CID_PATTERN);
                            const contextCID = matches && matches[0];
                            if (!contextCID) {
                                continue;
                            }
                            await safetyRunning(async () => {
                                const schemaContextString =
                                    await DataBaseHelper.loadFile(contextCID);
                                const schemaContext =
                                    JSON.parse(schemaContextString);
                                await checkForGeoJson(
                                    em,
                                    documentFile,
                                    schemaContext,
                                    document.consensusTimestamp
                                );
                            });
                        } else if (context) {
                            await checkForGeoJson(
                                em,
                                documentFile,
                                context,
                                document.consensusTimestamp
                            );
                        }
                    }
                });
            }
        });
    }
}

async function getTotalIssuance() {
    const em = DataBaseHelper.getEntityManager();
    const tokens = await em.getCollection('token_cache').find();
    let totalSupply = 0;
    while (await tokens.hasNext()) {
        const token = await tokens.next();
        const decimals = parseInt(token.decimals, 10);
        const tokenTotalSupply = parseInt(token.totalSupply, 10);
        if (decimals > 0) {
            totalSupply += tokenTotalSupply / decimals;
        } else {
            totalSupply += tokenTotalSupply;
        }
    }
    return totalSupply;
}

export async function syncAnalytics() {
    const em = DataBaseHelper.getEntityManager();
    const registries = await em.count(Message, {
        type: MessageType.STANDARD_REGISTRY,
    });
    const methodologies = await em.count(Message, {
        type: MessageType.POLICY,
        action: MessageAction.CreatePolicy,
    });
    const projects = await em.count(Message, {
        type: MessageType.VC_DOCUMENT,
        action: MessageAction.CreateVC,
    });
    const totalIssuance = await getTotalIssuance();
    const date = new Date();
    await em.persistAndFlush(
        em.create(Analytics, {
            registries,
            methodologies,
            projects,
            totalIssuance,
            date,
        })
    );
    await safetyRunning(syncProjectLocations);
}
