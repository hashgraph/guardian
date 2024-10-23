export interface IConditionFormula {
    type: 'formula';
    formula: string;
}

export interface IConditionRange {
    type: 'range';
    variable: string;
    min: string | number;
    max: string | number;
}

export interface IConditionText {
    type: 'text';
    variable: string;
    value: string
}

export interface IConditionEnum {
    type: 'enum';
    variable: string;
    value: string[]
}

export interface IConditionIfData {
    type: 'if';
    condition: (IConditionFormula | IConditionRange | IConditionText | IConditionEnum);
    formula: (IConditionFormula | IConditionRange | IConditionText | IConditionEnum);
}

export interface IConditionElseData {
    type: 'else';
    formula: (IConditionFormula | IConditionRange | IConditionText | IConditionEnum);
}

export interface IConditionRuleData {
    type: 'condition';
    conditions: (IConditionIfData | IConditionElseData)[]
}

export interface IFormulaRuleData {
    type: 'formula';
    formula: string;
}

export interface IRangeRuleData {
    type: 'range';
    min: string | number;
    max: string | number;
}

export interface ISchemaRuleData {
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
    rule?: IFormulaRuleData | IConditionRuleData | IRangeRuleData;
}

export interface ISchemaRulesConfig {
    fields?: ISchemaRuleData[];
    schemas?: string[];
}

export interface ISchemaRules {
    id?: string;
    name?: string;
    description?: string;
    instanceTopicId?: string;
    policyId?: string;
    owner?: string;
    status?: string;
    config?: ISchemaRulesConfig;
}