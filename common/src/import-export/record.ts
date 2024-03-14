import JSZip from 'jszip';
import { Record } from '../entity/index.js';
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
        const vcs = await db.getVcDocuments<any[]>({
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        });
        for (const vc of vcs) {
            results.push({
                id: vc.document.id,
                type: 'vc',
                document: vc.document
            });
        }
        const vps = await db.getVpDocuments<any[]>({
            updateDate: {
                $gte: new Date(startTime),
                $lt: new Date(endTime)
            }
        });
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
                results.push({
                    id: schema.contextURL || schema.iri,
                    type: 'schema',
                    document: schema.document
                });
            }
        }
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
            return { records, time, results };
        } else {
            return { records, time, results: [] };
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

        return {
            records,
            results,
            time: now
        };
    }
}
