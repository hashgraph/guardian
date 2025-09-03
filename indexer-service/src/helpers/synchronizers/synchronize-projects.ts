import { DataBaseHelper, Message, ProjectCoordinates } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import { MessageType, MessageAction, IPFS_CID_PATTERN } from '@indexer/interfaces';
import { SynchronizationTask } from '../synchronization-task.js';
import { loadFiles } from '../load-files.js';
import { SchemaFileHelper } from '../../helpers/schema-file-helper.js';

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

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const projectLocations = await em
            .getCollection('project_coordinates')
            .distinct('projectId');

        const collection = em.getCollection<Message>('message');
        const documents = collection.find({
            type: MessageType.VC_DOCUMENT,
            action: MessageAction.CreateVC,
            consensusTimestamp: { $nin: projectLocations },
        }, {
            sort: { coordUpdate: 1 },
            limit: 100000
        });

        console.log(`Sync projects: load documents`)
        const allDocuments: Message[] = [];
        const fileIds: Set<string> = new Set<string>();
        while (await documents.hasNext()) {
            const document = await documents.next();
            if (
                Array.isArray(document.files) &&
                document.files.length !== 0
            ) {
                allDocuments.push(document);
                fileIds.add(document.files[Files.DOCUMENT_FILE]);
            }
        }

        console.log(`Sync projects: load schemas`)
        const schemas = collection.find({ type: MessageType.SCHEMA });
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const contextCID = SchemaFileHelper.getContextFile(schema);

            if (contextCID) {
                fileIds.add(contextCID);
            }
        }

        console.log(`Sync projects: load files`)
        const fileMap = await loadFiles(fileIds, false);

        console.log(`Sync projects: update data`)
        for (const document of allDocuments) {
            const coords = this.updateGeoCoordinates(document, fileMap);
            if (coords) {
                for (const coord of coords) {
                    const row = em.create(ProjectCoordinates, coord);
                    await safetyRunning(async () => {
                        await em.persistAndFlush(row);
                    });
                    // em.persist(row);
                }
            }
        }
        // await em.flush();

        console.log(`Sync VCs: update data`);
        for (const document of allDocuments) {
            const row = em.getReference(Message, document._id);
            row.coordUpdate = Date.now();
            em.persist(row);
        }
        console.log(`Sync VCs: flush`)
        await em.flush();
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
            const geoFieldsValues = this.findGeoJSONFieldsInDocument(subject, geoFields)
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

    private findGeoJSONFieldsInDocument(cs: any, map: any, result = []) {
        if (map[cs.type] && cs[map[cs.type]]) {
            const fields = map[cs.type];
            for (const field of fields) {
                result.push(cs[field]);
            }
        } else {
            for (const field in cs) {
                if (Object.prototype.toString.call(cs[field]) === '[object Object]') {
                    this.findGeoJSONFieldsInDocument(cs[field], map, result);
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
        item: { type: string; coordinates: any[] },
        projectId: string
    ) {
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