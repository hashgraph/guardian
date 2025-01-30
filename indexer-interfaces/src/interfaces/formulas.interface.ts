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

export interface IFormulaConfig {
    formulas?: IFormulaItem[];
}

export interface IFormula {
    id?: string;
    uuid?: string;
    name?: string;
    description?: string;
    policyId?: string;
    policyTopicId?: string;
    owner?: string;
    status?: string;
    config?: IFormulaConfig;
}