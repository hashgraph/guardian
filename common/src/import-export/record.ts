import JSZip from 'jszip';
import { Record } from '../entity';
import { DatabaseServer } from '../database-modules';

/**
 * Record result
 */
export interface IRecordResult {
    id: string;
    type: string;
    document: any;
}

/**
 * Record components
 */
export interface IRecordComponents {
    records: Record[];
    results: IRecordResult[];
    time: number;
}

/**
 * Record import export
 */
export class RecordImportExport {
    /**
     * Record filename
     */
    public static readonly recordFileName = 'actions.csv';

    private static addTime(time: string | number | Date, base: string | number | Date): number {
        return (Number(time) + Number(base));
    }

    private static diffTime(time: string | number | Date, base: string | number | Date): string {
        if (time && base) {
            return String(Number(time) - Number(base));
        } else {
            return '0';
        }
    }

    /**
     * Load record components
     * @param uuid record
     *
     * @returns components
     */
    public static async loadRecordComponents(uuid: string): Promise<IRecordComponents> {
        const records = await DatabaseServer.getRecord({ uuid }, { orderBy: { time: 'ASC' } });
        const first = records[0];
        const last = records[records.length - 1];
        const time: any = first ? first.time : null;
        const results: IRecordResult[] = [];
        if (first && last) {
            const db = new DatabaseServer(first.policyId);
            const vcs = await db.getVcDocuments<any[]>({
                updateDate: {
                    $gte: new Date(first.time),
                    $lt: new Date(last.time)
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
                    $gte: new Date(first.time),
                    $lt: new Date(last.time)
                }
            });
            for (const vp of vps) {
                results.push({
                    id: vp.document.id,
                    type: 'vp',
                    document: vp.document
                });
            }
        }
        return { records, time, results };
    }

    /**
     * Generate Zip File
     * @param record record to pack
     *
     * @returns Zip file
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

        for (const item of components.results) {
            zip.file(`results/${item.type}|${item.id}`, JSON.stringify(item.document));
        }

        zip.file(RecordImportExport.recordFileName, json);
        return zip;
    }

    /**
     * Parse zip record file
     * @param zipFile Zip file
     * @returns Parsed record
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
            const [type, id] = name.split('|');
            const json = await file[1].async('string');
            const document = JSON.parse(json);
            results.push({ id, type, document });
        }

        const records: any[] = [];
        const now = Date.now();
        const lines = recordString.split('\r\n');
        for (const line of lines) {
            if (line) {
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