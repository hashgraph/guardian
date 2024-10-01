export interface IFormulaData {
    id: string;
    type: string;
    description: string;
    formula: string;
}

export interface IVariableData {
    id: string;
    schemaId: string;
    path: string;
    schemaName: string;
    schemaPath: string;
    fieldType: string;
    fieldRef: boolean;
    fieldArray: boolean;
    fieldDescription: string;
    fieldProperty: string;
    fieldPropertyName: string;
}

export interface IScoreOption {
    description: string;
    value: number | string;
}

export interface IScoreData {
    id: string;
    type: string;
    description: string;
    relationships: string[];
    options: IScoreOption[];
}

export enum RuleType {
    Main = 'main',
    Related = 'related',
    Unrelated = 'unrelated'
}

export interface IRuleData {
    schemaId: string;
    type: RuleType;
    unique: boolean | string;
}

export interface IStatisticConfig {
    variables?: IVariableData[],
    scores?: IScoreData[],
    formulas?: IFormulaData[],
    rules?: IRuleData[]
}

export interface IStatistic {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    policyId?: string;
    owner?: string;
    status?: string;
    config?: IStatisticConfig;
}