import { SchemaCondition } from '../interface/schema-condition.interface.js';
import { SchemaField } from '../interface/schema-field.interface.js';
import { Schema } from '../models/schema.js';
import { SchemaEntity } from '../type/schema-entity.type.js';
import { UnitSystem } from '../type/unit-system.type.js';
import { FieldTypesDictionary, DefaultFieldDictionary } from './field-types-dictionary.js';

export enum JsonError {
    INVALID_FORMAT = 'Invalid format for variable "${prop}" in ${entity}. ${message}',
    NOT_AVAILABLE = 'Using property "${prop}" in ${entity} is not available in this field type.',
    THEN_ELSE = 'Empty "then" or "else" branches, at least one value must be specified.'
}

export enum JsonErrorMessage {
    STRING = 'Value of type string is required.',
    BOOLEAN = 'Value of type boolean is required.',
    TYPE = 'Value of a primitive type or a sub-schema reference is required.',
    SIZE = 'Positive numeric value between 0 and 70 is required.',
    COLOR = 'Rgb color definition in format #xxxxxx is required.',
    REQUIRED_ENUM = 'Value must be one of [None, Required, Hidden, Auto Calculate]',
    ENUM = 'Value of type enum or a reference to enum is required.',
    ARRAY = 'Value of type array is required.',
    REF = 'Value must be a reference to an existing field.',
    REQUIRED_ENTITY = 'Value must be one of [NONE, VC, EVC]',
}

export interface IFieldJson {
    key: string;
    title: string;
    description: string;
    required: string;
    type: string;
    isArray: boolean;
    property: string;

    private?: boolean;

    enum?: string[] | string;

    textSize?: string;
    textColor?: string;
    textBold?: boolean;
    pattern?: string;

    expression?: string;

    unit?: string;

    examples?: any[];
    default?: any[];
    suggest?: any[];
}

export interface IConditionJson {
    if: {
        field: string,
        value: any
    },
    then: IFieldJson[],
    else: IFieldJson[]
}

export interface ISchemaJson {
    name: string;
    description: string;
    entity: SchemaEntity;
    topicId: string;
    fields: IFieldJson[];
    conditions: IConditionJson[];
}

export interface IErrorContext {
    entity?: string;
    property?: string;
    reason?: string;
}

export class ErrorContext implements IErrorContext {
    public entity: string;
    public property: string;
    public error: string;
    public message: string;
    public data: any;

    private path: string[];

    constructor() {
        this.entity = '';
        this.property = '';
        this.error = '';
        this.message = '';
    }

    public setData(data: any) {
        this.data = data;
    }

    public setPath(path: string[]): ErrorContext {
        this.path = path;
        this.entity = '';
        this.property = '';
        if (this.path) {
            this.entity = this.entity + this.path[0];
            for (let i = 1; i < this.path.length - 1; i++) {
                const entity = this.path[i];
                if (entity && entity.startsWith('[')) {
                    this.entity = this.entity + entity;
                } else {
                    this.entity = this.entity + '.' + entity;
                }
            }
            for (let i = this.path.length - 1; i < this.path.length; i++) {
                const entity = this.path[i];
                if (entity && entity.startsWith('[')) {
                    this.property = this.path[i - 1] + entity;
                } else {
                    this.property = entity;
                }
            }
        }
        return this;
    }

    public add(field: string): ErrorContext {
        const path = this.path ? this.path.slice() : [];
        path.push(field);
        return (
            new ErrorContext()
                .setPath(path)
        )
    }

    public setMessage(
        error: JsonError,
        message?: JsonErrorMessage
    ): ErrorContext {
        this.error = error;
        this.message = message || '';
        return this;
    }
}

export class SchemaToJson {
    private static getType(field: SchemaField): string {
        if (field.isRef) {
            return field.type;
        }
        if (field.unitSystem === UnitSystem.Prefix) {
            return 'Prefix';
        }
        if (field.unitSystem === UnitSystem.Postfix) {
            return 'Postfix';
        }
        if (field.customType === 'hederaAccount') {
            return 'HederaAccount';
        }

        for (const type of FieldTypesDictionary.FieldTypes) {
            if (FieldTypesDictionary.equal(field, type)) {
                return type.name;
            }
        }

        return '';
    }

    private static getPattern(field: SchemaField): string | undefined {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (FieldTypesDictionary.equal(field, type)) {
                return type.pattern;
            }
        }
        if (field.type === 'string') {
            return field.pattern;
        }
        return undefined;
    }

    private static getRequired(field: SchemaField): string {
        if (field.autocalculate) {
            return 'Auto Calculate';
        }
        if (field.hidden) {
            return 'Hidden';
        }
        if (field.required) {
            return 'Required';
        }
        return 'None';
    }

    private static getPrivate(field: SchemaField): boolean | null {
        if (typeof field.isPrivate === 'boolean') {
            return field.isPrivate;
        }
        return null;
    }

    private static getEnum(field: SchemaField): string | string[] | null {
        if (field.enum) {
            return field.enum;
        }
        if (field.remoteLink) {
            return field.remoteLink;
        }
        return null;
    }

    private static getFront(field: SchemaField): {
        size: string;
        color: string;
        bold: boolean;
    } | null {
        if (field.textSize || field.textColor || field.textBold) {
            return {
                size: field.textSize || '18',
                color: field.textColor || '#000000',
                bold: field.textBold || false,
            };
        }
        return null;
    }

    private static getExpression(field: SchemaField): string | null {
        if (field.autocalculate) {
            return field.expression || '';
        }
        return null;
    }

    private static getUnit(field: SchemaField): string | null {
        if (field.unitSystem) {
            return field.unit;
        }
        return null;
    }

    private static getExamples(field: SchemaField): string[] | null {
        if (field.examples && field.examples[0]) {
            return field.examples[0];
        }
        return null;
    }
    private static getDefault(field: SchemaField): string[] | null {
        if (field.default) {
            return field.default;
        }
        return null;
    }

    private static getSuggest(field: SchemaField): string[] | null {
        if (field.suggest) {
            return field.suggest;
        }
        return null;
    }

    public static fieldToJson(field: SchemaField, order: number): IFieldJson {
        const fieldJson: IFieldJson = {
            key: field.name || '',
            title: field.title || '',
            description: field.description || '',
            required: SchemaToJson.getRequired(field),
            type: SchemaToJson.getType(field),
            pattern: SchemaToJson.getPattern(field),
            isArray: field.isArray,
            property: field.property || ''
        };

        const privateValue = SchemaToJson.getPrivate(field);
        if (privateValue !== null) {
            fieldJson.private = privateValue;
        }

        const enumValue = SchemaToJson.getEnum(field);
        if (enumValue) {
            fieldJson.enum = enumValue;
        }

        const font = SchemaToJson.getFront(field);
        if (font) {
            fieldJson.textSize = font.size;
            fieldJson.textColor = font.color;
            fieldJson.textBold = font.bold;
        }

        const expression = SchemaToJson.getExpression(field);
        if (expression !== null) {
            fieldJson.expression = expression;
        }

        const unit = SchemaToJson.getUnit(field);
        if (unit) {
            fieldJson.unit = unit;
        }

        const examples = SchemaToJson.getExamples(field);
        if (examples) {
            fieldJson.examples = examples;
        }
        const defaultValue = SchemaToJson.getDefault(field);
        if (defaultValue) {
            fieldJson.default = defaultValue;
        }
        const suggest = SchemaToJson.getSuggest(field);
        if (suggest) {
            fieldJson.suggest = suggest;
        }

        return fieldJson;
    }

    public static conditionToJson(condition: SchemaCondition): IConditionJson {
        const json: IConditionJson = {
            if: {
                field: condition.ifCondition?.field?.name,
                value: condition.ifCondition?.fieldValue
            },
            then: [],
            else: []
        };
        if (condition.thenFields) {
            for (let index = 0; index < condition.thenFields.length; index++) {
                json.then.push(SchemaToJson.fieldToJson(condition.thenFields[index], index));
            }
        }
        if (condition.elseFields) {
            for (let index = 0; index < condition.elseFields.length; index++) {
                json.else.push(SchemaToJson.fieldToJson(condition.elseFields[index], index));
            }
        }
        return json;
    }

    public static schemaToJson(schema: Schema): ISchemaJson {
        const json: ISchemaJson = {
            name: schema.name || '',
            description: schema.description || '',
            entity: schema.entity || SchemaEntity.NONE,
            topicId: schema.topicId || '',
            fields: [],
            conditions: []
        };

        const fields = schema.fields || [];
        const conditions = schema.conditions || [];

        for (let index = 0; index < fields.length; index++) {
            if (!fields[index].readOnly) {
                json.fields.push(SchemaToJson.fieldToJson(fields[index], index));
            }
        }

        for (const condition of conditions) {
            json.conditions.push(SchemaToJson.conditionToJson(condition));
        }

        return json;
    }
}

export class JsonToSchema {
    private static equalString(a: string, b: string): boolean {
        if (a === b) {
            return true;
        }
        if (typeof a === 'string' && typeof b === 'string') {
            if (a.toLowerCase() === b.toLowerCase()) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private static fromString(
        value: any,
        context: ErrorContext
    ): string | undefined {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'undefined') {
            return undefined;
        }
        throw JsonToSchema.createError(
            context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.STRING)
        );
    }

    private static fromRequiredString(
        value: any,
        context: ErrorContext
    ): string {
        if (typeof value === 'string' && value) {
            return value;
        }
        throw JsonToSchema.createError(
            context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.STRING)
        );
    }

    private static fromBoolean(
        value: any,
        context: ErrorContext
    ): boolean | undefined {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        if (value !== undefined) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.BOOLEAN)
            );
        }
        return undefined;
    }

    private static fromEntity(
        value: any,
        context: ErrorContext
    ): SchemaEntity {
        if (value === SchemaEntity.NONE) {
            return SchemaEntity.NONE;
        }
        if (value === SchemaEntity.VC) {
            return SchemaEntity.VC;
        }
        if (value === SchemaEntity.EVC) {
            return SchemaEntity.EVC;
        }
        throw JsonToSchema.createError(
            context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.REQUIRED_ENTITY)
        );
    }

    private static fromType(
        value: IFieldJson,
        all: Schema[],
        context: ErrorContext
    ): string {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.type;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.type;
            }
        }
        for (const subSchema of all) {
            if (value.type === subSchema.iri) {
                return subSchema.iri;
            }
        }
        throw JsonToSchema.createError(
            context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.TYPE)
        );
    }

    private static fromFormat(
        value: IFieldJson,
        context: ErrorContext
    ): string | undefined {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.format;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.format;
            }
        }
        return undefined;
    }

    private static fromPattern(
        value: IFieldJson,
        context: ErrorContext
    ): string | undefined {
        if (JsonToSchema.equalString(value.type, 'String')) {
            return JsonToSchema.fromString(value.pattern, context);
        }
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.pattern;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.pattern;
            }
        }
        if (value.pattern) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        return undefined;
    }

    private static fromIsRef(
        value: IFieldJson,
        all: Schema[],
        context: ErrorContext
    ): boolean {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return false;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return false;
            }
        }
        for (const subSchema of all) {
            if (value.type === subSchema.iri) {
                return true;
            }
        }
        return false;
    }

    private static fromUnit(
        value: IFieldJson,
        context: ErrorContext
    ): string | undefined {
        if (JsonToSchema.equalString(value.type, 'Prefix')) {
            return JsonToSchema.fromString(value.unit, context);
        }
        if (JsonToSchema.equalString(value.type, 'Postfix')) {
            return JsonToSchema.fromString(value.unit, context);
        }
        return undefined;
    }

    private static fromUnitType(
        value: IFieldJson,
        context: ErrorContext
    ): UnitSystem | undefined {
        if (JsonToSchema.equalString(value.type, 'Prefix')) {
            return UnitSystem.Prefix;
        }
        if (JsonToSchema.equalString(value.type, 'Postfix')) {
            return UnitSystem.Postfix;
        }
        return undefined;
    }

    private static fromCustomType(
        value: IFieldJson,
        context: ErrorContext
    ): string | undefined {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.customType;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return type.customType;
            }
        }
        return undefined;
    }

    private static fromFont(
        value: IFieldJson,
        context: ErrorContext
    ): {
        size: string | undefined;
        color: string | undefined;
        bold: boolean | undefined;
    } {
        if (JsonToSchema.equalString(value.type, 'Help Text')) {
            return {
                size: JsonToSchema.fromTextSize(value.textSize, context.add('textSize')) || '18',
                color: JsonToSchema.fromTextColor(value.textColor, context.add('textColor')) || '#000000',
                bold: JsonToSchema.fromBoolean(value.textBold, context.add('textBold')) || false,
            }
        }
        if (value.textSize) {
            throw JsonToSchema.createError(
                context
                    .add('textSize')
                    .setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        if (value.textColor) {
            throw JsonToSchema.createError(
                context
                    .add('textColor')
                    .setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        if (value.textBold) {
            throw JsonToSchema.createError(
                context
                    .add('textBold')
                    .setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        return {
            size: undefined,
            color: undefined,
            bold: undefined
        }
    }

    private static fromTextSize(
        value: any,
        context: ErrorContext
    ): string | undefined {
        if (typeof value === 'number') {
            if (value && value > 0 && value < 70) {
                return String(value);
            }
        }
        if (typeof value === 'string') {
            const v = Number(value.replace('px', ''));
            if (v && v > 0 && v < 70) {
                return String(v);
            }
        }
        if (value) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.SIZE)
            );
        }
        return undefined;
    }

    private static fromTextColor(
        value: any,
        context: ErrorContext
    ): string | undefined {
        if (typeof value === 'string') {
            if ((new RegExp('^\#([a-fA-F0-9][a-fA-F0-9][a-fA-F0-9]){1,2}$')).test(value)) {
                return value;
            }
        }
        if (value) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.COLOR)
            );
        }
        return undefined;
    }

    private static fromRequired(
        value: IFieldJson,
        context: ErrorContext
    ): {
        required: boolean,
        hidden: boolean,
        autocalculate: boolean,
    } {
        context = context.add('required');
        const required: any = value.required;
        if (required === true || required === 'true') {
            return {
                required: true,
                hidden: false,
                autocalculate: false
            };
        }
        if (required === false || required === 'false') {
            return {
                required: false,
                hidden: false,
                autocalculate: false
            };
        }
        if (JsonToSchema.equalString(required, 'None')) {
            return {
                required: false,
                hidden: false,
                autocalculate: false
            };
        }
        if (JsonToSchema.equalString(required, 'Required')) {
            return {
                required: true,
                hidden: false,
                autocalculate: false
            };
        }
        if (JsonToSchema.equalString(required, 'Hidden')) {
            return {
                required: false,
                hidden: true,
                autocalculate: false
            };
        }
        if (JsonToSchema.equalString(required, 'Auto Calculate')) {
            return {
                required: false,
                hidden: false,
                autocalculate: true
            };
        }
        if (required) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.REQUIRED_ENUM)
            );
        }
        return {
            required: false,
            hidden: false,
            autocalculate: false
        };
    }

    private static fromIsPrivate(
        value: IFieldJson,
        entity: SchemaEntity,
        context: ErrorContext
    ): boolean | undefined {
        context = context.add('private');
        if (entity === SchemaEntity.EVC) {
            return JsonToSchema.fromBoolean(value.private, context);
        }
        if (value.private !== undefined) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        return undefined;
    }

    private static fromEnum(
        value: IFieldJson,
        context: ErrorContext
    ): {
        enum: string[] | undefined,
        link: string | undefined,
    } {
        context = context.add('enum');
        if (JsonToSchema.equalString(value.type, 'Enum')) {
            if (Array.isArray(value.enum)) {
                const enumValue: string[] = [];
                for (let i = 0; i < value.enum.length; i++) {
                    enumValue.push(
                        JsonToSchema.fromRequiredString(value.enum[i], context.add(`[${i}]`))
                    )
                }
                return {
                    enum: enumValue,
                    link: undefined
                }
            } else if (typeof value.enum === 'string') {
                return {
                    enum: undefined,
                    link: value.enum
                }
            } else {
                throw JsonToSchema.createError(
                    context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ENUM)
                );
            }
        }
        if (value.enum) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        return {
            enum: undefined,
            link: undefined
        }
    }

    private static fromExpression(
        value: IFieldJson,
        context: ErrorContext
    ): string | undefined {
        context = context.add('expression');
        if (JsonToSchema.equalString(value.type, 'Auto Calculate')) {
            return JsonToSchema.fromString(value.expression, context);
        }
        if (value.expression) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.NOT_AVAILABLE)
            );
        }
        return undefined;
    }

    private static fromExamples(
        value: IFieldJson,
        context: ErrorContext
    ): {
        examples: any[] | undefined,
        suggest: any[] | undefined,
        default: any[] | undefined,
    } {
        let examplesValue: any[] | undefined = undefined;
        let suggestValue: any[] | undefined = undefined;
        let defaultValue: any[] | undefined = undefined;

        if (value.examples) {
            if (Array.isArray(value.examples)) {
                examplesValue = [value.examples];
            } else {
                throw JsonToSchema.createError(
                    context
                        .add('examples')
                        .setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }
        }
        if (value.suggest) {
            if (Array.isArray(value.suggest)) {
                suggestValue = value.suggest;
            } else {
                throw JsonToSchema.createError(
                    context
                        .add('suggest')
                        .setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }
        }
        if (value.default) {
            if (Array.isArray(value.default)) {
                defaultValue = value.default;
            } else {
                throw JsonToSchema.createError(
                    context
                        .add('default')
                        .setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }
        }

        return {
            examples: examplesValue,
            suggest: suggestValue,
            default: defaultValue,
        }
    }

    private static fromSubFields(
        value: IFieldJson,
        all: Schema[],
        context: ErrorContext
    ): SchemaField[] {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return [];
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (JsonToSchema.equalString(value.type, type.name)) {
                return [];
            }
        }
        for (const subSchema of all) {
            if (value.type === subSchema.iri) {
                return JSON.parse(JSON.stringify(subSchema.fields));
            }
        }
        return [];
    }

    private static fromField(
        value: IFieldJson,
        index: number,
        all: Schema[],
        entity: SchemaEntity,
        context: ErrorContext
    ): SchemaField {
        context = context.add(`[${index}]`);
        const field: SchemaField = {
            name: JsonToSchema.fromRequiredString(value.key, context.add('key')),
            title: JsonToSchema.fromString(value.title, context.add('title')),
            description: JsonToSchema.fromString(value.description, context.add('description')) || '',
            property: JsonToSchema.fromString(value.property, context.add('property')) || '',
            type: JsonToSchema.fromType(value, all, context.add('type')),
            format: JsonToSchema.fromFormat(value, context.add('format')) as any,
            pattern: JsonToSchema.fromPattern(value, context.add('pattern')) as any,
            unit: JsonToSchema.fromUnit(value, context.add('unit')) as any,
            unitSystem: JsonToSchema.fromUnitType(value, context.add('unitSystem')) as any,
            customType: JsonToSchema.fromCustomType(value, context.add('customType')) as any,
            isArray: JsonToSchema.fromBoolean(value.isArray, context.add('isArray')) || false,
            isRef: JsonToSchema.fromIsRef(value, all, context),
            isPrivate: JsonToSchema.fromIsPrivate(value, entity, context),

            required: JsonToSchema.fromRequired(value, context).required,
            hidden: JsonToSchema.fromRequired(value, context).hidden,
            autocalculate: JsonToSchema.fromRequired(value, context).autocalculate,

            textColor: JsonToSchema.fromFont(value, context).color,
            textSize: JsonToSchema.fromFont(value, context).size,
            textBold: JsonToSchema.fromFont(value, context).bold,

            enum: JsonToSchema.fromEnum(value, context).enum,
            remoteLink: JsonToSchema.fromEnum(value, context).link,

            expression: JsonToSchema.fromExpression(value, context),

            examples: JsonToSchema.fromExamples(value, context).examples,
            suggest: JsonToSchema.fromExamples(value, context).suggest,
            default: JsonToSchema.fromExamples(value, context).default,

            fields: JsonToSchema.fromSubFields(value, all, context),

            order: index,

            readOnly: false,
        }
        return field;
    }

    private static fromDefaultField(
        defaultConfig: any
    ): SchemaField {
        const schemaField: SchemaField = {
            name: defaultConfig.name,
            title: defaultConfig.title,
            description: defaultConfig.description,
            autocalculate: defaultConfig.autocalculate,
            expression: defaultConfig.expression,
            required: defaultConfig.required,
            isArray: defaultConfig.isArray,
            isRef: defaultConfig.isRef,
            type: defaultConfig.type,
            format: defaultConfig.format,
            pattern: defaultConfig.pattern,
            unit: defaultConfig.unit,
            unitSystem: defaultConfig.unitSystem,
            customType: defaultConfig.customType,
            isPrivate: defaultConfig.isPrivate,
            property: defaultConfig.property,
            readOnly: true,
        };
        return schemaField;
    }

    private static fromDefaultFields(
        fields: SchemaField[],
        entity: SchemaEntity
    ): SchemaField[] {
        const defaultFields = DefaultFieldDictionary.getDefaultFields(entity);
        for (const defaultField of defaultFields) {
            fields.push(JsonToSchema.fromDefaultField(defaultField));
        }
        return fields;
    }

    private static fromCondTarget(
        value: IConditionJson,
        fields: SchemaField[],
        context: ErrorContext
    ): SchemaField {
        context = context.add('if').add('field');
        const target = fields.find((f) => f.name === value.if?.field);
        if (!target) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.REF)
            );
        }
        return target;
    }

    private static fromCondValue(
        value: IConditionJson,
        context: ErrorContext
    ): any {
        return value?.if?.value;
    }

    private static fromCondFields(
        value: IConditionJson,
        all: Schema[],
        entity: SchemaEntity,
        context: ErrorContext
    ): {
        then: SchemaField[];
        else: SchemaField[];
    } {
        let thenFields: SchemaField[];
        let elseFields: SchemaField[];
        if (value.then) {
            if (Array.isArray(value.then)) {
                thenFields = JsonToSchema.fromFields(value.then, all, entity, context.add(`then`));
            } else {
                throw JsonToSchema.createError(
                    context
                        .add('then')
                        .setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }
        } else {
            thenFields = [];
        }
        if (value.else) {
            if (Array.isArray(value.else)) {
                elseFields = JsonToSchema.fromFields(value.else, all, entity, context.add(`else`));
            } else {
                throw JsonToSchema.createError(
                    context
                        .add('else')
                        .setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }
        } else {
            elseFields = [];
        }
        if (thenFields.length === 0 && elseFields.length === 0) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.THEN_ELSE)
            );
        }
        return {
            then: thenFields,
            else: elseFields
        }
    }

    private static fromCondition(
        value: IConditionJson,
        index: number,
        fields: SchemaField[],
        all: Schema[],
        entity: SchemaEntity,
        context: ErrorContext
    ): SchemaCondition {
        context = context.add(`[${index}]`);
        const condition: SchemaCondition = {
            ifCondition: {
                field: JsonToSchema.fromCondTarget(value, fields, context),
                fieldValue: JsonToSchema.fromCondValue(value, context),
            },
            thenFields: JsonToSchema.fromCondFields(value, all, entity, context).then,
            elseFields: JsonToSchema.fromCondFields(value, all, entity, context).else,
        }
        return condition;
    }

    private static fromFields(
        value: IFieldJson[],
        all: Schema[],
        entity: SchemaEntity,
        context: ErrorContext
    ): SchemaField[] {
        const fields: SchemaField[] = [];
        if (!Array.isArray(value)) {
            throw JsonToSchema.createError(
                context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
            );
        }

        for (let index = 0; index < value.length; index++) {
            const field = JsonToSchema.fromField(value[index], index, all, entity, context);
            fields.push(field);
        }

        return fields;
    }

    private static fromConditions(
        value: IConditionJson[],
        fields: SchemaField[],
        all: Schema[],
        entity: SchemaEntity,
        context: ErrorContext
    ): SchemaCondition[] {
        const conditions: SchemaCondition[] = [];
        if (value) {
            if (!Array.isArray(value)) {
                throw JsonToSchema.createError(
                    context.setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.ARRAY)
                );
            }

            for (let index = 0; index < value.length; index++) {
                const condition = JsonToSchema.fromCondition(value[index], index, fields, all, entity, context);
                conditions.push(condition);
            }
        }
        return conditions;
    }

    public static fromJson(json: ISchemaJson, all: Schema[]) {
        const context: ErrorContext = new ErrorContext();
        context.setPath(['schema']);
        context.setData(json);
        const name = JsonToSchema.fromRequiredString(json.name, context.add('name'));
        const description = JsonToSchema.fromString(json.description, context.add('description'));
        const entity = JsonToSchema.fromEntity(json.entity, context.add('entity'));
        const fields = JsonToSchema.fromFields(json.fields, all, entity, context.add('fields'));
        const conditions = JsonToSchema.fromConditions(json.conditions, fields, all, entity, context.add('conditions'));
        JsonToSchema.fromDefaultFields(fields, entity);
        return {
            name,
            description,
            entity,
            fields,
            conditions
        }
    }

    private static createError(context: ErrorContext) {
        let massage = context.error;
        massage = massage.replace('${prop}', context.property);
        massage = massage.replace('${entity}', context.entity);
        massage = massage.replace('${message}', context.message);
        throw new Error(massage);
    }
}