import { SchemaField } from '../interface';
import { UnitSystem } from '../type/unit-system.type.js';

/**
 * Field types dictionary
 */
export class FieldTypesDictionary {
    /**
     * Form field types
     */
    public static readonly FieldTypes = [
        {
            name: 'Number',
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Integer',
            type: 'integer',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: 'String',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Boolean',
            type: 'boolean',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Date',
            type: 'string',
            format: 'date',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Time',
            type: 'string',
            format: 'time',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'DateTime',
            type: 'string',
            format: 'date-time',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Duration',
            type: 'string',
            format: 'duration',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'URL',
            type: 'string',
            format: 'url',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'URI',
            type: 'string',
            format: 'uri',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Email',
            type: 'string',
            format: 'email',
            pattern: undefined,
            isRef: false
        },
        {
            name: 'Image',
            type: 'string',
            format: undefined,
            pattern: '^ipfs:\/\/.+',
            isRef: false
        },
        {
            name: 'Enum',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'enum'
        },
        {
            name: 'Help Text',
            type: 'null',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: 'GeoJSON',
            type: '#GeoJSON',
            format: undefined,
            pattern: undefined,
            isRef: true,
            customType: 'geo'
        },
        {
            name: 'SentinelHUB',
            type: '#SentinelHUB',
            format: undefined,
            pattern: undefined,
            isRef: true,
            customType: 'sentinel'
        }
    ];

    public static readonly CustomFieldTypes = [
        {
            name: UnitSystem.Postfix,
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: '',
            unitSystem: UnitSystem.Postfix
        },
        {
            name: UnitSystem.Prefix,
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false,
            unit: '',
            unitSystem: UnitSystem.Prefix
        },
        {
            name: 'hederaAccount',
            type: 'string',
            format: undefined,
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            isRef: false,
            customType: 'hederaAccount'
        }
    ];

    /**
     * Measure types
     */
    public static readonly MeasureFieldTypes = [];

    public static equal(field: SchemaField, type: any): boolean {
        return (
            field.type == type.type &&
            field.format == type.format &&
            field.pattern == type.pattern &&
            field.isRef == type.isRef &&
            field.customType == type.customType
        )
    }
}
