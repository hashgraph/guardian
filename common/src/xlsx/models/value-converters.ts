import { DocumentGenerator, SchemaEntity, SchemaField } from '@guardian/interfaces';
import { FieldTypes, IFieldTypes } from './dictionary.js';

export function entityToXlsx(entity: SchemaEntity): string {
    if (entity === SchemaEntity.VC) {
        return 'Verifiable Credentials';
    } else if (entity === SchemaEntity.EVC) {
        return 'Encrypted Verifiable Credential';
    } else {
        return 'Sub-Schema';
    }
}

export function xlsxToEntity(value: string): SchemaEntity {
    if (value === 'VC' || value === 'Verifiable Credentials') {
        return SchemaEntity.VC;
    } else if (value === 'EVC' || value === 'Encrypted Verifiable Credential') {
        return SchemaEntity.EVC;
    } else {
        return SchemaEntity.NONE;
    }
}

export function xlsxToUnit(format: string): string {
    return format.match(/[^0,\#,\_,\s,\-,\*,\;,\?,\@,\,,\."]{1,}/g)[0];
}

export function xlsxToFont(value: any): any {
    try {
        if (typeof value === 'string') {
            return JSON.parse(value);
        } else if (value) {
            const result: any = {};
            result.bold = !!value.bold;
            result.size = value.size ? `${value.size}px` : '';
            result.color = value?.color?.argb?.scale(2) || ''
        }
        return {};
    } catch (error) {
        return {};
    }
}

export function xlsxToPresetArray(
    field: { type: string; isRef?: boolean },
    value: string
): string[] | number[] {
    const parseRegex = /("[^"]*")|([^,]+)/g;
    const matches = value.match(parseRegex);
    return matches.map((match) => xlsxToPresetValue(field, match)) as
        | string[]
        | number[];
}

export function xlsxToPresetValue(
    field: { type: string; isRef?: boolean },
    value: string
): string | number | boolean | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (field.isRef) {
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }
    switch (field.type) {
        case 'string':
            return value;
        case 'number':
            return Number(value) || 0;
        case 'boolean':
            return Boolean(value);
        default:
            return null;
    }
}

export function unitToXlsx(type: any): string {
    if (type.unitSystem === 'prefix') {
        return `"${type.unit}"#,##0.00`;
    }
    if (type.unitSystem === 'postfix') {
        return `#,##0.00"${type.unit}"`;
    }
    return ''
}

export function stringToXlsx(value: string): string {
    return value ? value : '';
}

export function numberToXlsx(value: number): string {
    return value !== undefined ? String(value) : '';
}

export function booleanToXlsx(value: boolean): string {
    return value === true ? 'Yes' : (value === false ? 'No' : '');
}

export function anyToXlsx(value: any): string {
    if (value === undefined || value === null) {
        return '';
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => anyToXlsx(item))
            .filter(Boolean)
            .join(', ');
    }
    if (Object.prototype.toString.call(value) === '[object Object]') {
        return JSON.stringify(value);
    }
    return String(value);
}

export function examplesToXlsx(field: SchemaField): string {
    if (Array.isArray(field.examples)) {
        return anyToXlsx(field.examples[0]);
    } else {
        return DocumentGenerator.generateExample(field) || '';
    }
}

export function xlsxToArray(value: any, multiple: boolean): any[] {
    if (value) {
        if (multiple) {
            return [[value]];
        } else {
            return [value];
        }
    }
    return [];
}

export function fontToXlsx(font: any, base?: any): any {
    const result: any = {
        font: {}
    };

    result.font.bold = !!font.bold;
    if (font.size) {
        result.font.size = font.size.replace('px', '');
    }
    if (font.color) {
        result.font.color = { argb: `FF${font.color.replace('#', '')}` }
    }
    if (base) {
        return Object.assign({}, base, result);
    } else {
        return result;
    }
}

export function typeToXlsx(field: IFieldTypes): string {
    return FieldTypes.findByValue(field)?.name;
}

export function formulaToXlsx(value: string): any {
    return { f: value };
}

export function xlsxToString(value: string): string {
    return value;
}

export function xlsxToNumber(value: string): number {
    return Number(value);
}

export function xlsxToBoolean(value: string): boolean {
    return value === 'Yes';
}

export function xlsxToAny(value: string): any {
    return value;
}

export function xlsxToType(value: string): IFieldTypes {
    return FieldTypes.findByName(value);
}

export function valueToFormula(value: any): any {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return `"${value}"`;
    }
    if (typeof value?.toString === 'function') {
        return value.toString();
    }
    return value;
}
