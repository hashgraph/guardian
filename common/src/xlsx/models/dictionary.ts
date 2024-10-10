export interface IFieldTypes {
    name?: string;
    type?: string;
    format?: string;
    pattern?: any;
    isRef?: boolean;
    hidden?: boolean;
    unit?: string;
    unitSystem?: string;
    customType?: string;
    pars?: (value: any) => any;
}

export enum Dictionary {
    REQUIRED_FIELD = 'Required Field',
    FIELD_TYPE = 'Field Type',
    PARAMETER = 'Parameter',
    QUESTION = 'Question',
    ALLOW_MULTIPLE_ANSWERS = 'Allow Multiple Answers',
    ANSWER = 'Answer',
    AUTO_CALCULATE = 'Auto-Calculate',
    SUB_SCHEMA = 'Sub-Schema',
    SCHEMA_NAME = 'Schema',
    SCHEMA_DESCRIPTION = 'Description',
    VISIBILITY = 'Visibility',
    SCHEMA_TYPE = 'Schema Type',
    SCHEMA_TOOL = 'Tool',
    SCHEMA_TOOL_ID = 'Tool Id',
    ENUM_SCHEMA_NAME = 'Schema name',
    ENUM_FIELD_NAME = 'Field name',
}

export class FieldTypes {
    public static default: IFieldTypes[] = [
        {
            name: 'Number',
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => {
                const v = Number(value);
                return Number.isFinite(v) ? v : ''
            }
        },
        {
            name: 'Integer',
            type: 'integer',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => {
                const v = Number(value);
                return Number.isInteger(v) ? v : ''
            }
        },
        {
            name: 'String',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'Boolean',
            type: 'boolean',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => !!(value)
        },
        {
            name: 'Date',
            type: 'string',
            format: 'date',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'Time',
            type: 'string',
            format: 'time',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'DateTime',
            type: 'string',
            format: 'date-time',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'Duration',
            type: 'string',
            format: 'duration',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'URL',
            type: 'string',
            format: 'url',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'URI',
            type: 'string',
            format: 'uri',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'Email',
            type: 'string',
            format: 'email',
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'Image',
            type: 'string',
            format: undefined,
            pattern: '^ipfs:\/\/.+',
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'Enum',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: 'enum',
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'Help Text',
            type: 'null',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'GeoJSON',
            type: '#GeoJSON',
            format: undefined,
            pattern: undefined,
            isRef: true,
            unit: undefined,
            unitSystem: undefined,
            customType: 'geo',
            hidden: false,
            pars: (value: any) => (value)
        },
        {
            name: 'Postfix',
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: '',
            unitSystem: 'postfix',
            customType: undefined,
            hidden: false,
            pars: (value: any) => {
                const v = Number(value);
                return Number.isFinite(v) ? v : ''
            }
        },
        {
            name: 'Prefix',
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: '',
            unitSystem: 'prefix',
            customType: undefined,
            hidden: false,
            pars: (value: any) => {
                const v = Number(value);
                return Number.isFinite(v) ? v : ''
            }
        },
        {
            name: 'HederaAccount',
            type: 'string',
            format: undefined,
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            isRef: false,
            customType: 'hederaAccount',
            unit: undefined,
            unitSystem: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
        {
            name: 'Auto-Calculate',
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: true,
            pars: (value: any) => (value)
        },
        {
            name: 'Pattern',
            type: 'string',
            format: undefined,
            pattern: true,
            isRef: false,
            unit: undefined,
            unitSystem: undefined,
            customType: undefined,
            hidden: false,
            pars: (value: any) => String(value)
        },
    ];

    private static _equal(a: any, b: any): boolean {
        return (a === b) || (!a && !b);
    }

    private static _equalPattern(defaultType: any, field: any): boolean {
        if (defaultType === true) {
            return !!field;
        } else {
            return FieldTypes._equal(defaultType, field);
        }
    }

    public static equal(
        defaultType: IFieldTypes,
        field: IFieldTypes
    ): boolean {
        return (
            FieldTypes._equal(defaultType.type, field.type) &&
            FieldTypes._equal(defaultType.format, field.format) &&
            FieldTypes._equal(defaultType.isRef, field.isRef) &&
            FieldTypes._equal(defaultType.unitSystem, field.unitSystem) &&
            FieldTypes._equal(defaultType.customType, field.customType) &&
            // FieldTypes._equal(defaultType.hidden, field.hidden) &&
            FieldTypes._equalPattern(defaultType.pattern, field.pattern)
        )
    }

    public static findByName(name: string): IFieldTypes {
        for (const type of FieldTypes.default) {
            if (type.name === name) {
                return type;
            }
        }
        return null;
    }

    public static findByValue(field: IFieldTypes): IFieldTypes {
        for (const defaultType of FieldTypes.default) {
            if (FieldTypes.equal(defaultType, field)) {
                return defaultType;
            }
        }
        return null;
    }
}
