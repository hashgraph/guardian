import { DataBaseHelper, Message, ProjectCoordinates } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import { MessageType, MessageAction, IPFS_CID_PATTERN } from '@indexer/interfaces';
import { SynchronizationTask } from '../synchronization-task.js';
import { fastLoadFiles } from '../load-files.js';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';
import { BatchLoadHelper } from '../batch-load-helper.js';
import { PrepareRecordHelper } from '../prepare-record-helper.js';

interface ICoord {
    coordinates: string,
    projectId: string
}

enum Files {
    DOCUMENT_FILE = 0,
    SCHEMA_FILE = 0,
    CONTEXT_FILE = 1
}

export class SynchronizationProjects extends SynchronizationTask {
    public readonly name: string = 'projects';

    constructor(mask: string) {
        super('projects', mask);
    }

    /** Mark schemas that contain a GeoJSON field, so the sync reads only the VCs that can have coordinates */
    private async prepareSchemas(): Promise<void> {
        console.log(`Preprocess schemas: start`);
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');
        const schemas = collection.find({
            type: MessageType.SCHEMA,
            files: { $exists: true, $not: { $size: 0 } },
            loaded: true,
            parsedHasGeoJson: { $exists: false },
        });

        await BatchLoadHelper.load<Message>(schemas, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Preprocess schemas: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`);
            const cids = new Set<string>();
            for (const schema of rows) {
                const cid = SchemaFileHelper.getContextFile(schema);
                if (cid) {
                    cids.add(cid);
                }
            }
            const fileMap = await fastLoadFiles(cids);
            for (const schema of rows) {
                const cid = SchemaFileHelper.getContextFile(schema);
                const context = cid ? this.parseFile(fileMap.get(cid)) : null;
                if (!context) {
                    // The context file is not readable yet, try again on the next run
                    continue;
                }
                const row = em.getReference(Message, schema._id);
                row.parsedHasGeoJson = this.schemaHasGeoJson(context);
                em.persist(row);
            }
            await em.flush();
            em.clear();
        });
    }

    public override async sync(): Promise<void> {
        await this.prepareSchemas();
        await PrepareRecordHelper.prepareVCMessages();

        const em = DataBaseHelper.getEntityManager();
        const projectLocations = await em
            .getCollection('project_coordinates')
            .distinct('projectId');

        const collection = em.getCollection<Message>('message');

        console.log(`Sync projects: load schemas`)
        const contextIds: Set<string> = new Set<string>();
        const schemas = collection.find({
            type: MessageType.SCHEMA,
            parsedHasGeoJson: true
        });
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const contextCID = SchemaFileHelper.getContextFile(schema);
            if (contextCID) {
                contextIds.add(contextCID);
            }
        }
        if (contextIds.size === 0) {
            console.log(`Sync projects: no schemas with geoJson`);
            return;
        }
        const contextFileMap = await fastLoadFiles(contextIds);

        const documents = collection.find({
            type: MessageType.VC_DOCUMENT,
            action: MessageAction.CreateVC,
            consensusTimestamp: { $nin: projectLocations },
            files: { $exists: true, $not: { $size: 0 } },
            loaded: true,
            'parsedContextId.context': { $in: Array.from(contextIds) },
        }, {
            sort: { coordUpdate: 1 },
            limit: 100000
        });

        await BatchLoadHelper.load<Message>(documents, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Sync projects: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`)
            const fileIds: Set<string> = new Set<string>();
            for (const document of rows) {
                fileIds.add(document.files[Files.DOCUMENT_FILE]);
            }
            const fileMap = await fastLoadFiles(fileIds);
            contextFileMap.forEach((value, key) => fileMap.set(key, value));

            console.log(`Sync projects: update data`)
            for (const document of rows) {
                const coords = this.updateGeoCoordinates(document, fileMap);
                if (coords) {
                    const savedCoordinates = new Set<string>();
                    for (const coord of coords) {
                        if (savedCoordinates.has(coord.coordinates)) {
                            continue;
                        }
                        savedCoordinates.add(coord.coordinates);
                        const coordinates = em.create(ProjectCoordinates, coord);
                        await safetyRunning(async () => {
                            await em.persistAndFlush(coordinates);
                        });
                    }
                }
                const row = em.getReference(Message, document._id);
                row.coordUpdate = Date.now();
                em.persist(row);
            }
            console.log(`Sync projects: flush batch`)
            await em.flush();
            em.clear();
        });
    }

    private updateGeoCoordinates(
        document: Message,
        fileMap: Map<string, string>
    ): ICoord[] {
        const storage: ICoord[] = [];
        const documentFileId = document.files[Files.DOCUMENT_FILE];
        const documentFileString = fileMap.get(documentFileId);
        const documentFile = this.parseFile(documentFileString);
        const subject = this.getSubject(documentFile);
        if (!subject) {
            return null;
        }

        const schemaContexts = this.getContexts(documentFile, fileMap);
        for (const context of schemaContexts) {
            this.checkForGeoJson(
                storage,
                documentFile,
                context,
                document.consensusTimestamp
            );
        }
        return storage;
    }

    private parseFile(file: string | undefined): any | null {
        try {
            if (file) {
                return JSON.parse(file);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    private getSubject(document: any): any {
        if (document && document.credentialSubject) {
            return document.credentialSubject[0] || document.credentialSubject
        }
        return null;
    }

    private getContexts(documentFile: any, fileMap: Map<string, string>): any[] {
        const result: any[] = [];
        let contexts = documentFile['@context'];
        contexts = Array.isArray(contexts) ? contexts : [contexts];
        for (const item of contexts) {
            if (typeof item === 'string') {
                const matches = item.match(IPFS_CID_PATTERN);
                const contextCID = matches && matches[0];
                const context = this.loadContext(contextCID, fileMap);
                if (context) {
                    result.push(context);
                }
            } else if (item) {
                result.push(item);
            }
        }
        return result;
    }

    private loadContext(cid: string, fileMap: Map<string, string>): any {
        const schemaContextString = fileMap.get(cid);
        const schemaContext = this.parseFile(schemaContextString);
        return schemaContext;
    }

    private checkForGeoJson(
        storage: ICoord[],
        documentFile: any,
        schemaContext: any,
        projectId: string
    ) {
        if (this.schemaHasGeoJson(schemaContext)) {
            const subject = this.getSubject(documentFile);
            const geoFields = this.findGeoJsonFields(schemaContext);
            const refFields = this.findRefFields(schemaContext);
            const geoFieldsValues = this.findGeoJSONFieldsInDocument(subject, geoFields, refFields)
            for (const geoFieldsValue of geoFieldsValues) {
                if (Array.isArray(geoFieldsValue)) {
                    for (const item of geoFieldsValue) {
                        this.addCoordinates(storage, item, projectId);
                    }
                } else {
                    this.addCoordinates(storage, geoFieldsValue, projectId);
                }
            }
        }
    }

    private findGeoJSONFieldsInDocument(cs: any, map: any, refs: any, result = [], type = cs.type) {
        const fields: string[] = (map[type] || []).filter((field: string) => cs[field]);
        for (const field of fields) {
            result.push(cs[field]);
        }
        for (const field in cs) {
            if (!fields.includes(field) && Object.prototype.toString.call(cs[field]) === '[object Object]') {
                const refType = refs[type] && refs[type][field];
                this.findGeoJSONFieldsInDocument(cs[field], map, refs, result, cs[field].type || refType);
            }
        }
        return result;
    }

    private findRefFields(context: any) {
        context = context['@context'] || context;
        const result = {};
        for (const schema of Object.keys(context || {})) {
            const fields = context[schema] && context[schema]['@context'];
            if (Object.prototype.toString.call(fields) !== '[object Object]') {
                continue;
            }
            result[schema] = {};
            for (const field of Object.keys(fields)) {
                const id = fields[field] && fields[field]['@id'];
                const target = typeof id === 'string' ? id.slice(id.lastIndexOf('#') + 1) : null;
                if (target && context[target]) {
                    result[schema][field] = target;
                }
            }
        }
        return result;
    }

    private schemaHasGeoJson(context: any) {
        return context['@context']
            ? !!context['@context']['#GeoJSON']
            : !!context['#GeoJSON'];
    }

    private findGeoJsonFields(context: any, result = {}) {
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
                        if (context[schema]['@context'][field]['@id'].indexOf('#GeoJSON') > -1) {
                            result[schema].push(field);
                        }
                    });
                }
            });
        }
        return result;
    }

    private addCoordinates(
        storage: ICoord[],
        item: { type: string; coordinates?: any[]; features?: any[]; geometry?: any },
        projectId: string
    ) {
        if (!item) {
            return;
        }
        if (item.type === 'FeatureCollection') {
            for (const feature of item.features || []) {
                this.addCoordinates(storage, feature, projectId);
            }
            return;
        }
        if (item.type === 'Feature') {
            this.addCoordinates(storage, item.geometry, projectId);
            return;
        }
        if (!item.coordinates) {
            return;
        }
        switch (item.type) {
            case 'Point': {
                storage.push({
                    coordinates: `${item.coordinates[0].toString(10)}|${item.coordinates[1].toString(10)}`,
                    projectId,
                })
                break;
            }
            case 'MultiPoint':
            case 'LineString': {
                // for (const point of item.coordinates) {
                //     this.addCoordinates(
                //         storage,
                //         { type: 'Point', coordinates: point },
                //         projectId
                //     );
                // }

                let coordinatesCount = item.coordinates.length;
                const sumCoordinates: number[] = [0, 0];
                for (const point of item.coordinates) {
                    sumCoordinates[0] += point[0];
                    sumCoordinates[1] += point[1];
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                storage.push({
                    coordinates: `${centerCoordinate[0].toString(10)}|${centerCoordinate[1].toString(10)}`,
                    projectId,
                })
                break;
            }
            case 'Polygon':
            case 'MultiLineString': {
                // for (const line of item.coordinates) {
                //     this.addCoordinates(
                //         storage,
                //         { type: 'MultiPoint', coordinates: line },
                //         projectId
                //     );
                // }

                let coordinatesCount = 0;
                const sumCoordinates: number[] = [0, 0];
                for (const multiPoint of item.coordinates) {
                    for (const point of multiPoint) {
                        sumCoordinates[0] += point[0];
                        sumCoordinates[1] += point[1];
                    }
                    coordinatesCount += multiPoint.length;
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                storage.push({
                    coordinates: `${centerCoordinate[0].toString(10)}|${centerCoordinate[1].toString(10)}`,
                    projectId,
                })
                break;
            }
            case 'MultiPolygon': {
                // for (const polygon of item.coordinates) {
                //     this.addCoordinates(
                //         storage,
                //         { type: 'Polygon', coordinates: polygon },
                //         projectId
                //     );
                // }

                let coordinatesCount = 0;
                const sumCoordinates: number[] = [0, 0];
                for (const polygon of item.coordinates) {
                    for (const multiPoint of polygon) {
                        for (const point of multiPoint) {
                            sumCoordinates[0] += point[0];
                            sumCoordinates[1] += point[1];
                        }
                        coordinatesCount += multiPoint.length;
                    }
                }
                const centerCoordinate: number[] = [sumCoordinates[0] / coordinatesCount, sumCoordinates[1] / coordinatesCount];
                storage.push({
                    coordinates: `${centerCoordinate[0].toString(10)}|${centerCoordinate[1].toString(10)}`,
                    projectId,
                })
                break;
            }
            default:
                break;
        }
    }
}
