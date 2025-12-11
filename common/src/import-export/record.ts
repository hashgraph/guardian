import JSZip from 'jszip';
import { Record, VpDocument as VpDocumentCollection, VcDocument as VcDocumentCollection } from '../entity/index.js';
import { DatabaseServer } from '../database-modules/index.js';

/**
 * Record result
 */
export interface IRecordResult {
    /**
     * Document ID
     */
    id: string;
    /**
     * Document type
     */
    type: 'vc' | 'vp' | 'schema';
    /**
     * Document body (JSON)
     */
    document: any;
}

/**
 * Record components
 */
export interface IRecordComponents {
    /**
     * Recorded items
     */
    records: Record[];
    /**
     * Result (Documents)
     */
    results: IRecordResult[];
    /**
     * Current time
     */
    time: number;
    /**
     * Duration
     */
    duration: number;
}

/**
 * Record result
 */
export class RecordResult implements IRecordResult {
    /**
     * Document ID
     */
    public id: string;
    /**
     * Document type
     */
    public type: 'vc' | 'vp' | 'schema';
    /**
     * Document body (JSON)
     */
    public document: any;

    constructor(
        type: 'vc' | 'vp' | 'schema',
        id: string,
        document: any
    ) {
        this.type = type;
        this.id = id;
        this.document = document;
    }

    /**
     * Get document name
     */
    public get name(): string {
        return btoa(`${this.type}|${this.id}`);
    }

    /**
     * Get file
     */
    public get file(): string {
        return JSON.stringify(this.document);
    }

    /**
     * Create record item by json
     */
    public static from(name: string, json: string): RecordResult {
        const [type, id] = atob(name).split('|') as any[];
        const document = JSON.parse(json);
        return new RecordResult(type, id, document);
    }

    /**
     * Create record item by object
     */
    public static fromObject(item: IRecordResult): RecordResult {
        return new RecordResult(item.type, item.id, item.document);
    }

    /**
     * To object
     */
    public toObject(): IRecordResult {
        return {
            id: this.id,
            type: this.type,
            document: this.document
        };
    }
}

/**
 * Record import export
 */
export class RecordImportExport {
    /**
     * Record filename
     */
    public static readonly recordFileName = 'actions.csv';
    /**
     * Generate archive for single record entry
     * @param record
     */
    public static async generateSingleRecordZip(
    record: Record,
    results?: IRecordResult[]): Promise<JSZip> {
        const baseTime = record.time ? Number(record.time) : Date.now();


        const components: IRecordComponents = {
            records: [record],
            results: results || [],
            time: baseTime,
            duration: 0
        };
        return await RecordImportExport.generateZipFile(components);
    }

    /**
     * Get full time
     * @param time
     * @param base
     *
     * @returns time
     * @private
     */
    private static addTime(time: string | number | Date, base: string | number | Date): number {
        return (Number(time) + Number(base));
    }

    /**
     * Get diff time
     * @param time
     * @param base
     *
     * @returns time
     * @private
     */
    private static diffTime(time: string | number | Date, base: string | number | Date): string {
        if (time && base) {
            return String(Number(time) - Number(base));
        } else {
            return '0';
        }
    }

    private static duration(first: string | number | Date, last: string | number | Date): number {
        return (Number(last) - Number(first));
    }

    /**
     * Load record results
     * @param uuid record
     *
     * @returns results
     * @public
     * @static
     */
    public static async loadRecordResults(
        policyId: string,
        startTime: any,
        endTime: any
    ): Promise<IRecordResult[]> {
        const results: IRecordResult[] = [];
        const db = new DatabaseServer(policyId);
        const vcs = await db.getVcDocuments<VcDocumentCollection>({
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }) as VcDocumentCollection[];

        for (const vc of vcs) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }

        const vps = await db.getVpDocuments<VpDocumentCollection>({
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }) as VpDocumentCollection[];

        for (const vp of vps) {
            results.push({
                id: vp.document.id,
                type: 'vp',
                document: vp.document
            });
        }
        const policy = await DatabaseServer.getPolicyById(policyId);
        if (policy) {
            const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });
            for (const schema of schemas) {
                let id: string;
                if (schema.contextURL) {
                    id = schema.contextURL + schema.iri;
                } else if (schema.iri) {
                    id = schema.iri;
                } else {
                    id = '';
                }
                results.push({
                    id,
                    type: 'schema',
                    document: schema.document
                });
            }
        }
        return results;
    }


    /**
     * Load record results
     * @param uuid record
     *
     * @returns results
     * @public
     * @static
     */
    public static async loadRecordResultsForPublished(
        policyId: string,
        startTime: any,
        endTime: any,
        documentId: any
    ): Promise<IRecordResult[]> {
        const results: IRecordResult[] = [];
        const db = new DatabaseServer();
        const vcs = await db.getVcDocuments<VcDocumentCollection>({
            policyId,
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }) as VcDocumentCollection[];

        const vcs2 = await db.getVcDocuments<VcDocumentCollection>({
            policyId,
            id: documentId,
        }) as VcDocumentCollection[];

        const vcs3 = await db.getVcDocuments<VcDocumentCollection>({
            policyId,
        }) as VcDocumentCollection[];

        console.log(vcs, 'vcsvcsvcs');
        console.log(vcs2, 'vcs2vcs2vcs2');
        console.log(vcs3, 'vcs3vcs3vcs3');
        for (const vc of vcs3) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }

        for (const vc of vcs) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }

        for (const vc of vcs2) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }

        const vps = await db.getVpDocuments<VpDocumentCollection>({
            policyId,
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        }) as VpDocumentCollection[];

        const vps2 = await db.getVpDocuments<VpDocumentCollection>({
            policyId,
            id: documentId,
        }) as VpDocumentCollection[];
        console.log(vps, 'vpsvpsvps');
        for (const vp of vps) {
            results.push({
                id: vp.document.id,
                type: 'vp',
                document: vp.document
            });
        }

        for (const vp of vps2) {
            results.push({
                id: vp.document.id,
                type: 'vp',
                document: vp.document
            });
        }
        // const policy = await DatabaseServer.getPolicyById(policyId);
        // if (policy) {
        //     const schemas = await DatabaseServer.getSchemas({ topicId: policy.topicId });
        //     for (const schema of schemas) {
        //         let id: string;
        //         if (schema.contextURL) {
        //             id = schema.contextURL + schema.iri;
        //         } else if (schema.iri) {
        //             id = schema.iri;
        //         } else {
        //             id = '';
        //         }
        //         results.push({
        //             id,
        //             type: 'schema',
        //             document: schema.document
        //         });
        //     }
        // }
        return results;
    }

    /**
     * Load record components
     * @param uuid record
     *
     * @returns components
     * @public
     * @static
     */
    public static async loadRecordComponents(uuid: string): Promise<IRecordComponents> {
        const records = await DatabaseServer.getRecord({ uuid }, { orderBy: { time: 'ASC' } });
        const first = records[0];
        const last = records[records.length - 1];
        const time: any = first ? first.time : null;
        if (first && last) {
            const results = await RecordImportExport.loadRecordResults(first.policyId, first.time, last.time);
            const duration = RecordImportExport.duration(first.time, last.time);
            return { records, time, duration, results };
        } else {
            return { records, time, duration: 0, results: [] };
        }
    }

    /**
     * Generate Zip File
     * @param record record to pack
     *
     * @returns Zip file
     * @public
     * @static
     */
    public static async generate(uuid: string): Promise<JSZip> {
        const components = await RecordImportExport.loadRecordComponents(uuid);
        const file = await RecordImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components record components
     *
     * @returns Zip file
     * @public
     * @static
     */
    public static async generateZipFile(components: IRecordComponents): Promise<JSZip> {
        const zip = new JSZip();
        zip.folder('documents');
        zip.folder('results');

        let documentId = 0;
        let json = '';
        for (const item of components.records) {
            const row = [
                item.method,
                RecordImportExport.diffTime(item.time, components.time)
            ];
            if (item.method === 'START') {
                row.push('');
                row.push(item.user);
            }
            if (item.method === 'ACTION' || item.method === 'GENERATE') {
                row.push(item.action);
                row.push(item.user || '');
                row.push(item.target || '');
                if (item.document) {
                    row.push(String(documentId));
                    zip.file(`documents/${documentId}`, JSON.stringify(item.document));
                    documentId++;
                } else {
                    row.push('');
                }
            }
            json += row.join(',') + '\r\n';
        }

        for (const result of components.results) {
            const item = RecordResult.fromObject(result)
            zip.file(`results/${item.name}`, item.file);
        }

        zip.file(RecordImportExport.recordFileName, json);
        return zip;
    }

    /**
     * Parse zip record file
     * @param zipFile Zip file
     * @returns Parsed record
     * @public
     * @static
     */
    public static async parseZipFile(zipFile: any): Promise<IRecordComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[RecordImportExport.recordFileName] || content.files[RecordImportExport.recordFileName].dir) {
            throw new Error('Zip file is not a record');
        }
        const recordString = await content.files[RecordImportExport.recordFileName].async('string');
        const documents = new Map<any, any>();
        const documentFiles = Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^documents\/.+/.test(file[0]));
        for (const file of documentFiles) {
            const documentId = file[0].split('/')[1];
            const json = await file[1].async('string');
            const document = JSON.parse(json);
            documents.set(documentId, document);
        }

        const results: IRecordResult[] = [];
        const resultFiles = Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^results\/.+/.test(file[0]));
        for (const file of resultFiles) {
            const name = file[0].split('/')[1];
            const json = await file[1].async('string');
            results.push(RecordResult.from(name, json).toObject());
        }

        const records: any[] = [];
        const now = Date.now();
        const lines = recordString.split('\r\n');
        for (const line of lines) {
            if (line && !line.startsWith('--')) {
                const [method, time, action, user, target, documentId] = line.split(',');
                if (method) {
                    records.push({
                        method,
                        action,
                        user,
                        target,
                        time: RecordImportExport.addTime(now, time),
                        document: documents.get(documentId)
                    });
                }
            }
        }
        const first = records[0];
        const last = records[records.length - 1];
        const duration = RecordImportExport.duration(first?.time, last?.time);
        return {
            records,
            results,
            duration,
            time: now
        };
    }
}
