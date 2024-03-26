import { DatabaseServer, IRecordResult } from '@guardian/common';
import { CSV } from '../../table/csv.js';
import { ReportTable } from '../../table/report-table.js';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import { ICompareResult } from '../interfaces/compare-result.interface.js';
import { IMultiCompareResult } from '../interfaces/multi-compare-result.interface.js';
import { IReportTable } from '../interfaces/report-table.interface.js';
import { DocumentModel, VcDocumentModel, VpDocumentModel } from '../models/document.model.js';
import { SchemaModel } from '../models/schema.model.js';
import { DocumentsRate } from '../rates/documents-rate.js';
import { ComparePolicyUtils } from '../utils/compare-policy-utils.js';
import { MultiCompareUtils } from '../utils/multi-compare-utils.js';
import { CompareUtils } from '../utils/utils.js';
import { IRate } from '../interfaces/rate.interface.js';
import { RecordModel } from '../models/record.model.js';
import { RecordRate } from '../rates/record-rate.js';

/**
 * Component for comparing two record
 */
export class RecordComparator {
    /**
     * Compare Options
     * @private
     */
    private readonly options: CompareOptions;

    constructor(options?: CompareOptions) {
        this.options = options || CompareOptions.default;
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @param lvl
     * @private
     */
    private documentToTable(tree: DocumentsRate, table: ReportTable, lvl: number): void {
        const leftItem = tree.left;
        const rightItem = tree.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('type', tree.type);
        row.set('document_type', tree.documentType);
        row.set('document_schema', tree.schema);

        row.setArray('documents', tree.getSubRate(DocumentsRate.DOCUMENTS_RATE));
        row.setArray('options', tree.getSubRate(DocumentsRate.OPTIONS_RATE));

        row.set('left', leftItem?.toObject());
        row.set('right', rightItem?.toObject());

        if (leftItem) {
            row.set('left_id', leftItem.id);
            row.set('left_message_id', leftItem.messageId);
            row.set('left_type', leftItem.type);
            row.set('left_schema', leftItem.title());
            row.set('left_owner', leftItem.owner);
        }
        if (rightItem) {
            row.set('right_id', rightItem.id);
            row.set('right_message_id', rightItem.messageId);
            row.set('right_type', rightItem.type);
            row.set('right_schema', rightItem.title());
            row.set('right_owner', rightItem.owner);
        }
        if (leftItem && rightItem) {
            row.set('document_rate', `${tree.getRateValue(DocumentsRate.DOCUMENTS_RATE)}%`);
            row.set('options_rate', `${tree.getRateValue(DocumentsRate.OPTIONS_RATE)}%`);
            row.set('total_rate', `${tree.getRateValue(DocumentsRate.TOTAL_RATE)}%`);
        } else {
            row.set('document_rate', `-`);
            row.set('options_rate', `-`);
            row.set('total_rate', `-`);
        }

        for (const child of tree.getChildren<DocumentsRate>()) {
            this.documentToTable(child, table, lvl + 1);
        }
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @param lvl
     * @private
     */
    private recordToTable(tree: RecordRate, table: ReportTable, lvl: number): void {
        const leftItem = tree.left;
        const rightItem = tree.right;
        const row = table.createRow();

        row.set('lvl', lvl);
        row.set('left', leftItem?.toObject());
        row.set('right', rightItem?.toObject());

        if (leftItem && rightItem) {
            row.set('total_rate', `${tree.getRateValue(DocumentsRate.TOTAL_RATE)}%`);
        } else {
            row.set('total_rate', `-`);
        }

        for (const child of tree.getChildren<DocumentsRate>()) {
            this.documentToTable(child, table, lvl + 1);
        }
    }

    /**
     * Compare two documents
     * @param document1 - left document
     * @param document2 - right document
     * @private
     */
    private compareTwoDocuments(
        document1: RecordModel,
        document2: RecordModel
    ): ICompareResult<any> {
        const columns = [
            { name: 'type', label: '', type: 'string' },
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'document_type', label: '', type: 'string' },
            { name: 'document_schema', label: '', type: 'string' },

            { name: 'left_id', label: 'ID', type: 'string' },
            { name: 'left_message_id', label: 'Message', type: 'string' },
            { name: 'left_type', label: 'Type', type: 'string' },
            { name: 'left_schema', label: 'Schema', type: 'string' },
            { name: 'left_owner', label: 'Owner', type: 'string' },

            { name: 'right_id', label: 'ID', type: 'string' },
            { name: 'right_message_id', label: 'Message', type: 'string' },
            { name: 'right_type', label: 'Type', type: 'string' },
            { name: 'right_schema', label: 'Schema', type: 'string' },
            { name: 'right_owner', label: 'Owner', type: 'string' },

            { name: 'document_rate', label: 'Document Rate', type: 'number', display: 'Rate' },
            { name: 'options_rate', label: 'Options Rate', type: 'number', display: 'Rate' },
            { name: 'total_rate', label: 'Total Rate', type: 'number', display: 'Rate' },

            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'documents', label: '', type: 'object' },
            { name: 'options', label: '', type: 'object' }
        ];

        const tree = ComparePolicyUtils.compareRecord(document1, document2, this.options);
        const table = new ReportTable(columns);

        this.recordToTable(tree, table, 1);

        const fields = ComparePolicyUtils.rateToTable(tree);
        const fieldsRate = this.total(fields);

        const result: ICompareResult<any> = {
            left: document1.info(),
            right: document2.info(),
            total: fieldsRate,
            documents: {
                columns,
                report: table.object(),
            }
        }
        return result;
    }

    /**
     * Compare documents
     * @param policies
     * @public
     */
    public compare(documents: RecordModel[]): any[] {
        const left = documents[0];
        const rights = documents.slice(1);
        const results: any[] = [];
        for (const right of rights) {
            const result = this.compareTwoDocuments(left, right);
            results.push(result);
        }
        return results;
    }

    /**
     * Convert result to CSV
     * @param results
     * @public
     */
    public static tableToCsv(results: ICompareResult<any>[]): string {
        const csv = new CSV();

        csv.add('Document 1').addLine();
        csv
            .add('Document ID')
            .add('Document Type')
            .add('Document Owner')
            .add('Policy')
            .addLine();
        csv
            .add(results[0].left.id)
            .add(results[0].left.type)
            .add(results[0].left.owner)
            .add(results[0].left.policy)
            .addLine();

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            csv.addLine();
            csv.add(`Document ${i + 2}`).addLine();
            csv
                .add('Document ID')
                .add('Document Type')
                .add('Document Owner')
                .add('Policy')
                .addLine();
            csv
                .add(result.right.id)
                .add(result.right.type)
                .add(result.right.owner)
                .add(result.right.policy)
                .addLine();
            csv.addLine();

            csv.add('Data').addLine();
            CompareUtils.tableToCsv(csv, result.documents);
            csv.addLine();

            csv.add('Total')
                .add(result.total + '%')
                .addLine();
        }

        return csv.result();
    }

    /**
     * Merge compare results
     * @param results
     * @public
     */
    public mergeCompareResults(results: ICompareResult<any>[]): IMultiCompareResult<any> {
        const documentsTable = this.mergeDocumentTables(results.map(r => r.documents));
        const multiResult: IMultiCompareResult<any> = {
            size: results.length + 1,
            left: results[0].left,
            rights: results.map(r => r.right),
            totals: results.map(r => r.total),
            documents: documentsTable
        };
        return multiResult;
    }

    /**
     * Merge documents tables
     * @param rates
     * @private
     */
    private mergeDocumentTables(tables: IReportTable[]): IReportTable {
        const documentColumns: any[] = [
            { name: 'lvl', label: 'Offset', type: 'number' },
            { name: 'document_type', label: '', type: 'string' },
            { name: 'document_schema', label: '', type: 'string' },
            { name: 'left', label: '', type: 'object' },
            { name: 'left_id', label: 'ID', type: 'string' },
            { name: 'left_message_id', label: 'Message', type: 'string' },
            { name: 'left_type', label: 'Type', type: 'string' },
            { name: 'left_schema', label: 'Schema', type: 'string' },
            { name: 'left_owner', label: 'Owner', type: 'string' },
            { name: 'documents', label: '', type: 'object' },
            { name: 'options', label: '', type: 'object' },
        ];
        for (let index = 0; index < tables.length; index++) {
            const i = index + 1;
            documentColumns.push({ name: `type_${i}`, label: '', type: 'string' });
            documentColumns.push({ name: `right_${i}`, label: '', type: 'object' });
            documentColumns.push({ name: `right_id_${i}`, label: 'ID', type: 'string' });
            documentColumns.push({ name: `right_message_id_${i}`, label: 'Message', type: 'string' });
            documentColumns.push({ name: `right_type_${i}`, label: 'Type', type: 'string' });
            documentColumns.push({ name: `right_schema_${i}`, label: 'Schema', type: 'string' });
            documentColumns.push({ name: `right_owner_${i}`, label: 'Owner', type: 'string' });
            documentColumns.push({ name: `document_rate_${i}`, label: 'Document Rate', type: 'number' });
            documentColumns.push({ name: `options_rate_${i}`, label: 'Options Rate', type: 'number' });
            documentColumns.push({ name: `total_rate_${i}`, label: 'Total Rate', type: 'number' });
        }
        const mergeResults = MultiCompareUtils.mergeTables<any>(tables);
        const table: any[] = [];
        for (const mergeResult of mergeResults) {
            const cols = mergeResult.cols;
            const size = cols.length - 1;
            const row: any = { size };
            for (let index = 0; index < cols.length; index++) {
                const colData = cols[index];
                if (colData) {
                    if (index === 0) {
                        row[`lvl`] = colData.lvl;
                        row[`document_type`] = colData.document_type;
                        row[`document_schema`] = colData.document_schema;
                        row[`left`] = colData.left;
                        row[`left_id`] = colData.left_id;
                        row[`left_message_id`] = colData.left_message_id;
                        row[`left_type`] = colData.left_type;
                        row[`left_schema`] = colData.left_schema;
                        row[`left_owner`] = colData.left_owner;
                    } else {
                        row[`lvl`] = colData.lvl;
                        row[`document_type`] = colData.document_type;
                        row[`document_schema`] = colData.document_schema;
                        row[`type_${index}`] = colData.type;
                        row[`right_${index}`] = colData.right;
                        row[`right_id_${index}`] = colData.right_id;
                        row[`right_message_id_${index}`] = colData.right_message_id;
                        row[`right_type_${index}`] = colData.right_type;
                        row[`right_schema_${index}`] = colData.right_schema;
                        row[`right_owner_${index}`] = colData.right_owner;
                        row[`document_rate_${index}`] = colData.document_rate;
                        row[`options_rate_${index}`] = colData.options_rate;
                        row[`total_rate_${index}`] = colData.total_rate;
                    }
                }
            }
            this.mergeRateTables(row, cols, 'documents');
            this.mergeRateTables(row, cols, 'options');
            table.push(row);
        }
        return {
            columns: documentColumns,
            report: table,
        }
    }

    /**
     * Merge Rates
     * @param rates
     * @private
     */
    private mergeRateTables(row: any, cols: any[], propName: string): any {
        row[propName] = [];
        const data: any[] = [];
        for (const colData of cols) {
            if (colData) {
                data.push(colData[propName]);
            } else {
                data.push(null);
            }
        }
        const mergeResults = MultiCompareUtils.mergeRates<any>(data);
        for (const mergeResult of mergeResults) {
            const propRow: any[] = mergeResult.cols.slice();
            row[propName].push(propRow);
        }
        return row;
    }

    /**
     * Calculate total rate
     * @param rates
     * @private
     */
    private total(rates: IRate<any>[]): number {
        let total = 0;
        for (let index = 1; index < rates.length; index++) {
            const child = rates[index];
            if (child.totalRate > 0) {
                total += child.totalRate;
            }
        }
        if (rates.length - 1 > 0) {
            return Math.floor(total / (rates.length - 1));
        }
        return 100;
    }

    /**
     * Create document model
     * @param cacheDocuments
     * @param cacheSchemas
     * @param id
     * @param options
     * @private
     * @static
     */
    private static async loadSchemas(
        document: DocumentModel,
        cacheSchemas: Map<string, SchemaModel>,
        options: CompareOptions
    ): Promise<SchemaModel[]> {
        const schemaModels: SchemaModel[] = [];
        const schemasIds = document.getSchemas();
        for (const schemasId of schemasIds) {
            let iri = schemasId?.replace('schema#', '#');
            iri = schemasId?.replace('schema:', '#');
            if (cacheSchemas.has(schemasId)) {
                const schemaModel = cacheSchemas.get(schemasId);
                if (schemaModel) {
                    schemaModels.push(schemaModel);
                }
            } else if (cacheSchemas.has(iri)) {
                const schemaModel = cacheSchemas.get(iri);
                if (schemaModel) {
                    schemaModels.push(schemaModel);
                }
            } else {
                const schema = (schemasId.startsWith('schema#') || schemasId.startsWith('schema:')) ?
                    await DatabaseServer.getSchema({ iri }) :
                    await DatabaseServer.getSchema({ contextURL: schemasId });
                if (schema) {
                    const schemaModel = new SchemaModel(schema, options);
                    schemaModel.update(options);
                    schemaModels.push(schemaModel);
                    cacheSchemas.set(schemasId, schemaModel);
                } else {
                    cacheSchemas.set(schemasId, null);
                }
            }
        }
        return schemaModels;
    }

    /**
     * Create policy model
     * @param documents
     * @param options
     * @public
     * @static
     */
    public static async createModel(documents: IRecordResult[], options: CompareOptions): Promise<RecordModel> {
        const model = new RecordModel(options);
        model.setDocuments(documents);

        const children: DocumentModel[] = [];
        const cacheSchemas = new Map<string, SchemaModel>();
        for (const document of documents) {
            if (document.type === 'schema') {
                const schemaModel = SchemaModel.from(document.document, options);
                schemaModel.update(options);
                cacheSchemas.set(document.id, schemaModel);
            }
        }
        for (let index = 0; index < documents.length; index++) {
            const document = documents[index];
            if (document.type === 'vc') {
                const child = VcDocumentModel.from(document.document, options);
                const schemaModels = await RecordComparator.loadSchemas(child, cacheSchemas, options);
                child.setAttributes(index);
                child.setRelationships([]);
                child.setSchemas(schemaModels);
                child.update(options);
                children.push(child);
            }
            if (document.type === 'vp') {
                const child = VpDocumentModel.from(document.document, options);
                const schemaModels = await RecordComparator.loadSchemas(child, cacheSchemas, options);
                child.setAttributes(index);
                child.setRelationships([]);
                child.setSchemas(schemaModels);
                child.update(options);
                children.push(child);
            }
        }
        model.setChildren(children);

        //Compare
        model.update(options);

        return model;
    }
}
