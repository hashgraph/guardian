import { DataBaseHelper, Message, ProjectCoordinates } from '@indexer/common';
import { safetyRunning } from '../../utils/safety-running.js';
import { MessageType, MessageAction, IPFS_CID_PATTERN, Schema, SchemaField } from '@indexer/interfaces';
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

    //** Prepare schemas. Extraxt schemaId and check geoJson */
    private async prepareSchemas() {

        console.log(`Preprocess schemas: start`);
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');
        const schemas = collection.find({
            type: MessageType.SCHEMA,
            files: { $exists: true, $not: { $size: 0 } }, //Already loaded file,
            parsedHasGeoJson: { $exists: false }, //Skip already parsed
        });

        await BatchLoadHelper.load<Message>(schemas, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Preprocess schemas: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`)

            const cids = rows.map((schema) => SchemaFileHelper.getDocumentFile(schema));
            const fileMap = await fastLoadFiles(new Set(cids));

            for (const rowShema of rows) {
                const schemaDocumentCID = SchemaFileHelper.getDocumentFile(rowShema);
                const schemaDocumentFileString = fileMap.get(schemaDocumentCID);
                const schemaDocumentFile = this.parseFile(schemaDocumentFileString);
                const schema = new Schema(schemaDocumentFile, '');
                const geoFields = this.findGeoJsonFields(schema.fields, []);

                const ids = []
                if (rowShema.files && rowShema.files[0]) {
                    ids.push(rowShema.files[0]);
                }
                if (rowShema.files && rowShema.files[1]) {
                    ids.push(rowShema.files[1]);
                }

                let hasGeoJson = false;
                if (geoFields.length) {
                    hasGeoJson = true;
                }

                const row = em.getReference(Message, rowShema._id);
                row.parsedHasGeoJson = hasGeoJson;
                row.parsedSchemaIds = ids;
                em.persist(row)
            }
            console.log(`Preprocess schemas: batch flush:`);
            await em.flush();
            await em.clear();
        });

        em.flush();
        em.clear();
    }


    public override async sync(): Promise<void> {

        await this.prepareSchemas();

        await PrepareRecordHelper.prepareVCMessages();

        const em = DataBaseHelper.getEntityManager();
        const projectLocations = await em
            .getCollection('project_coordinates')
            .distinct('projectId');

        // Get only schemas with geojson
        console.log(`Sync projects: load schemas cache`)
        const schemasFileIds: Set<string> = new Set<string>();
        const schemaMap = new Map<string, Message>();
        const schemas = em.getCollection<Message>('message').find({
            type: MessageType.SCHEMA,
            parsedHasGeoJson: true
        })
        while (await schemas.hasNext()) {
            const schema = await schemas.next();
            const documentCID = SchemaFileHelper.getDocumentFile(schema);
            if (documentCID) {
                schemasFileIds.add(documentCID);
            }
            if (schema.files && schema.files[0]) {
                schemaMap.set(schema.files[0], schema);
            }
            if (schema.files && schema.files[1]) {
                schemaMap.set(schema.files[1], schema);
            }
        }
        console.log('Sync projects: loaded ', schemasFileIds.size, 'schemas with geoJson');


        const collection = em.getCollection<Message>('message');
        const documents = collection.find({
            type: MessageType.VC_DOCUMENT,
            action: MessageAction.CreateVC,
            consensusTimestamp: { $nin: projectLocations },
            files: { $exists: true, $not: { $size: 0 } }, //Process only messages with files
            loaded: true, //Not process record without loaded status
            "parsedContextId.context": { $in: Array.from(schemaMap.keys()) }, //Get only with geoJson schemas
            processedProjects: { $ne: true }, //Skip already processed           
        }, {
            sort: { coordUpdate: 1 },
            //limit: 100000
        });

        if (!(await documents.hasNext())) {
            console.log(`Sync projects: No new records to process`);
            return;
        }

        console.log(`Sync projects: load schemas cache files`, schemasFileIds.size)
        const schemaFileMap = await fastLoadFiles(schemasFileIds);

        await BatchLoadHelper.load<Message>(documents, BatchLoadHelper.DEFAULT_BATCH_SIZE, async (rows, counter) => {
            console.log(`Sync projects: batch ${counter.batchIndex} start. Loaded ${counter.loadedTotal}`)

            console.log(`Sync projects: load documents`)
            const allDocuments: Message[] = [];
            const fileIds: Set<string> = new Set<string>()
            for (const document of rows) {
                if (
                    Array.isArray(document.files) &&
                    document.files.length !== 0
                ) {
                    allDocuments.push(document);
                    fileIds.add(document.files[Files.DOCUMENT_FILE]);
                };
            }

            console.log(`Sync projects: load files`, fileIds.size)
            const fileMap = await fastLoadFiles(fileIds);
            schemaFileMap.forEach((value, key) => fileMap.set(key, value));

            console.log(`Sync projects: update data`)
            for (const document of allDocuments) {
                const coords = this.updateGeoCoordinates(document, schemaMap, fileMap);
                if (coords) {
                    for (const coord of coords) {
                        const row = em.create(ProjectCoordinates, coord);
                        await safetyRunning(async () => {
                            await em.persistAndFlush(row);
                        });
                    }
                }

                //Mark record as processed
                const row = em.getReference(Message, document._id)
                row.processedProjects = true;
                em.persist(row)
            }
            console.log(`Sync projects: update VCs data`);
            for (const document of allDocuments) {
                const row = em.getReference(Message, document._id);
                row.coordUpdate = Date.now();
                em.persist(row);
            }
            console.log(`Sync projects: flush batch`)
            await em.flush();
            await em.clear();
        });
    }

    private updateGeoCoordinates(
        document: Message,
        schemaMap: Map<string, Message>,
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

        const schemaContext = SchemaFileHelper.getDocumentContext(documentFile);
        if (schemaContext) {
            const schemaMessage = SchemaFileHelper.findInMap(schemaMap, schemaContext);
            if (schemaMessage) {
                const schemaDocumentCID = SchemaFileHelper.getDocumentFile(schemaMessage);
                const schemaDocumentFileString = fileMap.get(schemaDocumentCID);
                const schemaDocumentFile = this.parseFile(schemaDocumentFileString);
                const schema = new Schema(schemaDocumentFile, '');
                const geoFields = this.findGeoJsonFields(schema.fields, []);
                for (const geoField of geoFields) {
                    this.findGeoValue(geoField, subject, storage, document.consensusTimestamp);
                }
            }
        }

        return storage;
    }

    private findGeoJsonFields(
        schemaFields: SchemaField[] | undefined,
        result: SchemaField[]
    ): SchemaField[] {
        if (Array.isArray(schemaFields)) {
            for (const schemaField of schemaFields) {
                result = this.findGeoJsonFields(schemaField.fields, result);
                if (schemaField.type === '#GeoJSON') {
                    result.push(schemaField);
                }
            }
        }
        return result;
    }

    private getObjectValue(document: any, path: string): any {
        let result: any = null;
        return path.split('.').reduce((acc, key) => acc?.[key], document);
    }

    private findGeoValue(
        geoField: SchemaField,
        subject: any,
        storage: ICoord[],
        projectId: string
    ): any {
        const path = geoField.path;
        const geoFieldsValue = this.getObjectValue(subject, path);

        if (Array.isArray(geoFieldsValue)) {
            for (const item of geoFieldsValue) {
                this.addCoordinates(storage, item, projectId);
            }
        } else if (geoFieldsValue) {
            this.addCoordinates(storage, geoFieldsValue, projectId);
        }
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
