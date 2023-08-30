import { DatabaseServer } from '@guardian/common';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import { DocumentModel, VcDocumentModel, VpDocumentModel } from '../models/document.model';
import { ComparePolicyUtils } from '../utils/compare-policy-utils';
import { ICompareResult } from '../interfaces/compare-result.interface';
import { DocumentsRate } from '../rates/documents-rate';
import { ReportTable } from '../../table/report-table';
import { CSV } from '../../table/csv';
import { IMultiCompareResult } from '../interfaces/multi-compare-result.interface';
import { SchemaModel } from '../models/schema.model';

/**
 * Component for comparing two documents
 */
export class DocumentComparator {
    /**
     * Compare Options
     * @private
     */
    private readonly options: ICompareOptions;

    constructor(options?: ICompareOptions) {
        // if (options) {
        //     this.propLvl = options.propLvl;
        //     this.childLvl = options.childLvl;
        //     this.eventLvl = options.eventLvl;
        //     this.idLvl = options.idLvl;
        // } else {
        //     this.propLvl = 2;
        //     this.childLvl = 2;
        //     this.eventLvl = 1;
        //     this.idLvl = 1;
        // }
        // this.options = {
        //     propLvl: this.propLvl,
        //     childLvl: this.childLvl,
        //     eventLvl: this.eventLvl,
        //     idLvl: this.idLvl,
        // }
    }

    /**
     * Convert tree to table
     * @param tree
     * @param table
     * @param lvl
     * @private
     */
    private treeToTable(tree: DocumentsRate, table: ReportTable, lvl: number): void {
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
            this.treeToTable(child, table, lvl + 1);
        }
    }

    /**
     * Compare two documents
     * @param document1 - left document
     * @param document2 - right document
     * @private
     */
    private compareTwoDocuments(document1: DocumentModel, document2: DocumentModel): ICompareResult<any> {
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

            { name: 'document_rate', label: 'Document Rate', type: 'number' },
            { name: 'options_rate', label: 'Options Rate', type: 'number' },
            { name: 'total_rate', label: 'Total Rate', type: 'number' },

            { name: 'left', label: '', type: 'object' },
            { name: 'right', label: '', type: 'object' },
            { name: 'documents', label: '', type: 'object' },
            { name: 'options', label: '', type: 'object' }
        ];

        const tree = ComparePolicyUtils.compareDocuments(document1, document2, this.options);
        const table = new ReportTable(columns);

        this.treeToTable(tree, table, 1);

        const result: ICompareResult<any> = {
            left: document1.info(),
            right: document2.info(),
            total: 0,
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
    public compare(documents: DocumentModel[]): any[] {
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
     * @param result
     * @public
     */
    public static tableToCsv(results: ICompareResult<any>[]): string {
        const csv = new CSV();
        return csv.result();
    }


    /**
     * Merge compare results
     * @param policies
     * @public
     */
    public mergeCompareResults(results: ICompareResult<any>[]): IMultiCompareResult<any> {
        const multiResult: IMultiCompareResult<any> = {
            size: results.length + 1,
            left: results[0].left,
            rights: results.map(r => r.right),
            totals: results.map(r => r.total)
        };
        return multiResult;
    }

    private static async loadDocument(id: string, options: ICompareOptions): Promise<DocumentModel> {
        let document: any;

        document = await DatabaseServer.getVCById(id);

        if (document) {
            return new VcDocumentModel(document, options);
        }

        document = await DatabaseServer.getVC({ messageId: id });

        if (document) {
            return new VcDocumentModel(document, options);
        }

        document = await DatabaseServer.getVPById(id);

        if (document) {
            return new VpDocumentModel(document, options);
        }

        document = await DatabaseServer.getVP({ messageId: id });

        if (document) {
            return new VpDocumentModel(document, options);
        }

        return null;
    }

    private static async createDocument(
        cacheDocuments: Map<string, DocumentModel>,
        cacheSchemas: Map<string, SchemaModel>,
        id: string,
        options: ICompareOptions
    ): Promise<DocumentModel> {
        if (cacheDocuments.has(id)) {
            return cacheDocuments.get(id);
        }

        const documentModel = await DocumentComparator.loadDocument(id, options);

        cacheDocuments.set(id, documentModel);

        if (!documentModel) {
            return null;
        }

        const relationshipModels: DocumentModel[] = [];
        for (const relationship of documentModel.relationshipIds) {
            const r = await DocumentComparator.createDocument(
                cacheDocuments, cacheSchemas, relationship, options
            );
            if (r) {
                relationshipModels.push(r);
            }
        }
        documentModel.setRelationships(relationshipModels);

        //Schemas
        const schemaModels: SchemaModel[] = [];
        const schemasIds = documentModel.getSchemas();
        for (const schemasId of schemasIds) {
            const schema = await DatabaseServer.getSchema({ contextURL: schemasId });
            if (schema) {
                const s = new SchemaModel(schema, options);
                s.update(options);
                schemaModels.push(s);
            }
        }
        documentModel.setSchemas(schemaModels);

        //Compare
        documentModel.update(options);

        return documentModel;
    }

    /**
     * Create policy model
     * @param id
     * @param options
     * @public
     * @static
     */
    public static async createModelById(id: string, options: ICompareOptions): Promise<DocumentModel> {
        const cacheDocuments = new Map<string, DocumentModel>();
        const cacheSchemas = new Map<string, SchemaModel>();
        const documentModel = await DocumentComparator.createDocument(
            cacheDocuments, cacheSchemas, id, options
        );

        if (!documentModel) {
            throw new Error('Unknown document');
        }

        return documentModel;
    }
}