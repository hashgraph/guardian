import { EntityStatus } from '../type/entity-status.type.js';

export enum FormulaItemType {
    Constant = 'constant',
    Variable = 'variable',
    Formula = 'formula',
    Text = 'text'
}

export interface IFormulaLink {
    type: 'formula' | 'schema';
    entityId: string;
    item: string;
}

export interface IFormulaItem {
    uuid: string;
    name: string;
    description: string;
    type: FormulaItemType;
    value?: any;
    link?: IFormulaLink | null;
    relationships?: string[];
}

export interface IFormulaFile {
    name?: string;
    url?: string;
    type?: string;
}

export interface IFormulaConfig {
    formulas?: IFormulaItem[];
    files?: IFormulaFile[];
}

export interface IFormula {
    id?: string;
    uuid?: string;
    name?: string;
    description?: string;
    policyId?: string;
    policyTopicId?: string;
    policyInstanceTopicId?: string;
    owner?: string;
    creator?: string;
    status?: EntityStatus;
    config?: IFormulaConfig;
}