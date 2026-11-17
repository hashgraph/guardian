
import { SchemaField } from '../interface/schema-field.interface.js';
import { SchemaEntity } from '../type/schema-entity.type.js';
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
            name: 'File',
            type: 'string',
            format: undefined,
            pattern: '^ipfs:\/\/.+',
            isRef: false,
            customType: 'file'
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
        },
        {
            name: 'Table',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'table'
        },
        {
            name: 'Country',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'country'
        },
        {
            name: 'Continent',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'continent'
        },
        {
            name: 'State/Province',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'state'
        },
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
        },
        {
            name: 'Rich Text',
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false,
            customType: 'richText'
        }
    ];

    /**
     * Measure types
     */
    public static readonly MeasureFieldTypes = [];

    public static readonly SystemFieldTypes = [{
        name: 'GeoJSON',
        type: '#GeoJSON',
        format: undefined,
        pattern: undefined,
        isRef: true,
        customType: undefined
    }, {
        name: 'SentinelHUB',
        type: '#SentinelHUB',
        format: undefined,
        pattern: undefined,
        isRef: true,
        customType: undefined
    }];

    public static equal(field: SchemaField, type: any): boolean {
        return (
            // tslint:disable-next-line:triple-equals
            field.type == type.type &&
            // tslint:disable-next-line:triple-equals
            field.format == type.format &&
            // tslint:disable-next-line:triple-equals
            field.pattern == type.pattern &&
            // tslint:disable-next-line:triple-equals
            field.isRef == type.isRef &&
            // tslint:disable-next-line:triple-equals
            field.customType == type.customType
        )
    }

    /**
     * The name the schema editor shows for a field's type. A bare JSON `type` is ambiguous
     * (`null` is Help Text, `string` may be a Date, an Email, an Enum...), so this resolves
     * it exactly as the editor does: unit system, then reference kind, then the dictionary
     * entry matching type, format, pattern and custom type. Anything unmatched is a String.
     */
    public static getLabel(field: {
        type?: string;
        format?: string;
        pattern?: string;
        customType?: string;
        isRef?: boolean;
        unitSystem?: string;
        refTemplateSchemaId?: string;
    }): string {
        if (!field) {
            return 'String';
        }
        if (field.unitSystem === UnitSystem.Prefix) {
            return 'Prefix';
        }
        if (field.unitSystem === UnitSystem.Postfix) {
            return 'Postfix';
        }
        if (field.isRef || field.refTemplateSchemaId) {
            if (field.type === '#GeoJSON') {
                return 'GeoJSON';
            }
            if (field.type === '#SentinelHUB') {
                return 'SentinelHUB';
            }
            return 'Sub-schema';
        }
        const match = [...FieldTypesDictionary.FieldTypes, ...FieldTypesDictionary.CustomFieldTypes].find((item: any) =>
            !item.isRef &&
            !item.unitSystem &&
            // tslint:disable-next-line:triple-equals
            field.type == item.type &&
            // tslint:disable-next-line:triple-equals
            (field.format || undefined) == item.format &&
            // tslint:disable-next-line:triple-equals
            (field.pattern || undefined) == item.pattern &&
            // tslint:disable-next-line:triple-equals
            (field.customType || undefined) == item.customType
        );
        if (!match) {
            return 'String';
        }
        return match.name === 'hederaAccount' ? 'Account' : match.name;
    }
}

export class DefaultFieldDictionary {
    public static readonly vcDefaultFields = [{
        name: 'policyId',
        title: 'Policy Id',
        description: 'Policy Id',
        required: true,
        isArray: false,
        isRef: false,
        type: 'string',
        format: undefined,
        pattern: undefined,
        readOnly: true
    }, {
        name: 'ref',
        title: 'Relationships',
        description: 'Relationships',
        required: false,
        isArray: false,
        isRef: false,
        type: 'string',
        format: undefined,
        pattern: undefined,
        readOnly: true
    }, {
        name: 'guardianVersion',
        title: 'Guardian Version',
        description: 'Guardian Version',
        required: false,
        isArray: false,
        isRef: false,
        type: 'string',
        format: undefined,
        pattern: undefined,
        readOnly: true
    }];

    public static getDefaultFields(entity: SchemaEntity) {
        if (entity === SchemaEntity.VC || entity === SchemaEntity.EVC) {
            return JSON.parse(JSON.stringify(DefaultFieldDictionary.vcDefaultFields));
        }
        return [];
    }
}
