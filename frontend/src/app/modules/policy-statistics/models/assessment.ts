import { IVCDocument } from "@guardian/interfaces";
import { IColumn } from "../../common/models/grid";

export interface IOption {
    id: string;
    description: string;
    value: any;
}

export interface IVariable {
    id: string;
    description: string;
    value: any;
    schemaId: string;
    path: string[];
    fullPath: string[];
    isArray: boolean;
}

export interface IScore {
    id: string;
    description: string;
    value: any;
    relationships: IVariable[];
    options: IOption[]
}

export interface IFormula {
    id: string;
    description: string;
    value: any;
    formula: string;
    type: string;
}

export interface IDocument {
    targetDocument: IVCDocument;
    relatedDocuments: IVCDocument[];
    unrelatedDocuments: IVCDocument[];
    __id?: string;
    __schemaId?: string;
    __schemaName?: string;
    __cols: Map<IColumn, any>;
}