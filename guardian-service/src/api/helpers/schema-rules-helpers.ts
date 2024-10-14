import {
    IConditionElseData,
    IConditionEnum,
    IConditionFormula,
    IConditionIfData,
    IConditionRange,
    IConditionRuleData,
    IConditionText,
    IFormulaRuleData,
    IRangeRuleData,
    ISchemaRuleData,
    ISchemaRulesConfig
} from '@guardian/interfaces';

function validateString(data: string): string {
    if (typeof data === 'string') {
        return data;
    } else {
        return '';
    }
}

function validateBoolean(data: string | boolean): boolean {
    return data === 'true' || data === true;
}

function validateStringOrNumber(data: string | number): string | number {
    if (typeof data === 'string') {
        return data;
    } else if (typeof data === 'number') {
        return data;
    } else {
        return '';
    }
}

function validateStrings(data?: string[]): string[] {
    const items: string[] = [];
    if (Array.isArray(data)) {
        for (const item of data) {
            items.push(validateString(item));
        }
    }
    return items;
}

function validateIfConditionValue(
    data: IConditionFormula | IConditionRange | IConditionText | IConditionEnum
): IConditionFormula | IConditionRange | IConditionText | IConditionEnum {
    if (data) {
        if (data.type === 'formula') {
            return {
                type: 'formula',
                formula: validateString(data.formula)
            }
        } else if (data.type === 'range') {
            return {
                type: 'range',
                variable: validateString(data.variable),
                min: validateStringOrNumber(data.min),
                max: validateStringOrNumber(data.max)
            }
        } else if (data.type === 'text') {
            return {
                type: 'text',
                variable: validateString(data.variable),
                value: validateString(data.value)
            }
        } else if (data.type === 'enum') {
            return {
                type: 'enum',
                variable: validateString(data.variable),
                value: validateStrings(data.value)
            }
        }
    }
    return {
        type: 'formula',
        formula: ''
    }
}

function validateIfCondition(data: IConditionIfData): IConditionIfData {
    const item: IConditionIfData = {
        type: 'if',
        condition: validateIfConditionValue(data.condition),
        formula: validateIfConditionValue(data.formula),
    };
    return item;
}

function validateElseCondition(data: IConditionElseData): IConditionElseData {
    const item: IConditionElseData = {
        type: 'else',
        formula: validateIfConditionValue(data.formula),
    };
    return item;
}

function validateCondition(
    data: (IConditionIfData | IConditionElseData)[]
): (IConditionIfData | IConditionElseData)[] {
    const result: (IConditionIfData | IConditionElseData)[] = [];
    if (Array.isArray(data)) {
        for (const item of data) {
            if (item.type === 'if') {
                result.push(validateIfCondition(item))
            } else if (item.type === 'else') {
                result.push(validateElseCondition(item))
            }
        }
    }
    return result;
}

function validateConditionRule(data: IConditionRuleData): IConditionRuleData {
    const item: IConditionRuleData = {
        type: 'condition',
        conditions: validateCondition(data.conditions)
    };
    return item;
}

function validateFormulaRule(data: IFormulaRuleData): IFormulaRuleData {
    const item: IFormulaRuleData = {
        type: 'formula',
        formula: validateString(data.formula)
    };
    return item;
}

function validateRangeRule(data: IRangeRuleData): IRangeRuleData {
    const item: IRangeRuleData = {
        type: 'range',
        min: validateStringOrNumber(data.min),
        max: validateStringOrNumber(data.max)
    };
    return item;
}

function validateRule(
    data?: IFormulaRuleData | IConditionRuleData | IRangeRuleData
): IFormulaRuleData | IConditionRuleData | IRangeRuleData {
    if (data) {
        if (data.type === 'condition') {
            return validateConditionRule(data);
        } else if (data.type === 'formula') {
            return validateFormulaRule(data);
        } else if (data.type === 'range') {
            return validateRangeRule(data);
        }
    }
    return undefined;
}

function validateVariable(data?: ISchemaRuleData): ISchemaRuleData {
    const variable: ISchemaRuleData = {
        id: validateString(data.id),
        schemaId: validateString(data.schemaId),
        path: validateString(data.path),
        schemaName: validateString(data.schemaName),
        schemaPath: validateString(data.schemaPath),
        fieldType: validateString(data.fieldType),
        fieldRef: validateBoolean(data.fieldRef),
        fieldArray: validateBoolean(data.fieldArray),
        fieldDescription: validateString(data.fieldDescription),
        fieldProperty: validateString(data.fieldProperty),
        fieldPropertyName: validateString(data.fieldPropertyName),
        rule: validateRule(data.rule),
    };
    return variable;
}

function validateVariables(data?: ISchemaRuleData[]): ISchemaRuleData[] {
    const fields: ISchemaRuleData[] = [];
    if (Array.isArray(data)) {
        for (const field of data) {
            fields.push(validateVariable(field));
        }
    }
    return fields;
}

export function validateRuleConfig(data?: ISchemaRulesConfig): ISchemaRulesConfig {
    const config: ISchemaRulesConfig = {
        fields: validateVariables(data?.fields),
    }
    return config;
}