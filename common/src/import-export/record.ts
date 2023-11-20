import JSZip from 'jszip';
import { Record } from '../entity';
import { DatabaseServer } from '../database-modules';

/**
 * Record components
 */
export interface IRecordComponents {
    records: Record[];
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

    /**
     * Load record components
     * @param uuid record
     *
     * @returns components
     */
    public static async loadRecordComponents(uuid: string): Promise<IRecordComponents> {
        const records = await DatabaseServer.getRecord({ uuid }, { orderBy: { time: 'ASC' } });
        const time: any = records.length ? records[0].time : null;
        return { records, time };
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

        const getTime = (time: any, base: any) => {
            if (time && base) {
                return (time - base);
            } else {
                return 0;
            }
        }

        let documentId = 0;
        let json = '';
        for (const item of components.records) {
            const row = [
                item.method,
                getTime(item.time, components.time)
            ];
            if (item.method === 'ACTION' || item.method === 'GENERATE') {
                row.push(item.action);
                row.push(item.user || '');
                row.push(item.target || '');
                if (item.document) {
                    row.push(documentId);
                    zip.file(`documents/${documentId}`, JSON.stringify(item.document));
                    documentId++;
                } else {
                    row.push('');
                }
            }
            json += row.join(',') + '\r\n';
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

        const records: any[] = [];
        const now = Date.now();
        const lines = recordString.split('\r\n');
        for (const line of lines) {
            const [method, time, action, user, target, documentId] = line.split(',');
            records.push({
                method,
                action,
                user,
                target,
                time: now + time,
                document: documents.get(documentId)
            })
        }

        return {
            records,
            time: now
        };
    }
}