import { DatabaseServer } from "@guardian/common";
import { ICompareOptions } from "../interfaces/compare-options.interface";
import { DocumentModel, VcDocumentModel, VpDocumentModel } from "../models/document.model";
import { ComparePolicyUtils } from "../utils/compare-policy-utils";

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
     * Compare two documents
     * @param document1 - left document
     * @param document2 - right document
     * @private
     */
    private compareTwoDocuments(document1: DocumentModel, document2: DocumentModel): any {
        const tree = ComparePolicyUtils.compareDocuments(document1, document2, this.options);

        const result: any = {
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
        cache: Map<string, DocumentModel>,
        id: string,
        options: ICompareOptions
    ): Promise<DocumentModel> {
        if (cache.has(id)) {
            return cache.get(id);
        }

        const documentModel = await DocumentComparator.loadDocument(id, options);

        cache.set(id, documentModel);

        if (!documentModel) {
            return null;
        }

        const relationshipModels: DocumentModel[] = [];
        for (const relationship of documentModel.relationshipIds) {
            const r = await DocumentComparator.createDocument(cache, relationship, options);
            relationshipModels.push(r);
        }
        documentModel.setRelationships(relationshipModels);

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
        const cache = new Map<string, DocumentModel>();
        const documentModel = await DocumentComparator.createDocument(cache, id, options);

        if (!documentModel) {
            throw new Error('Unknown document');
        }

        return documentModel;
    }
}