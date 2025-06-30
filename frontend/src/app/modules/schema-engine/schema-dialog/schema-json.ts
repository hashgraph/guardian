import { SchemaField, UnitSystem, FieldTypesDictionary, SchemaCondition, Schema, SchemaEntity } from '@guardian/interfaces';

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

    font?: any;
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

export class SchemaJson {
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
        if (field.examples) {
            return field.examples;
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
            required: SchemaJson.getRequired(field),
            type: SchemaJson.getType(field),
            pattern: SchemaJson.getPattern(field),
            isArray: field.isArray,
            property: field.property || ''
        };

        const privateValue = SchemaJson.getPrivate(field);
        if (privateValue !== null) {
            fieldJson.private = privateValue;
        }

        const enumValue = SchemaJson.getEnum(field);
        if (enumValue) {
            fieldJson.enum = enumValue;
        }

        const font = SchemaJson.getFront(field);
        if (font) {
            fieldJson.textSize = font.size;
            fieldJson.textColor = font.color;
            fieldJson.textBold = font.bold;
        }

        const expression = SchemaJson.getExpression(field);
        if (expression !== null) {
            fieldJson.expression = expression;
        }

        const unit = SchemaJson.getUnit(field);
        if (unit) {
            fieldJson.unit = unit;
        }

        const examples = SchemaJson.getExamples(field);
        if (examples) {
            fieldJson.examples = examples;
        }
        const defaultValue = SchemaJson.getDefault(field);
        if (defaultValue) {
            fieldJson.default = defaultValue;
        }
        const suggest = SchemaJson.getSuggest(field);
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
                json.then.push(SchemaJson.fieldToJson(condition.thenFields[index], index));
            }
        }
        if (condition.elseFields) {
            for (let index = 0; index < condition.elseFields.length; index++) {
                json.else.push(SchemaJson.fieldToJson(condition.elseFields[index], index));
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
            json.fields.push(SchemaJson.fieldToJson(fields[index], index));
        }

        for (const condition of conditions) {
            json.conditions.push(SchemaJson.conditionToJson(condition));
        }

        return json;
    }

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

    private static fromString(value: any, propName: string, position: string): string | undefined {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'undefined') {
            return undefined;
        }
        throw new Error(`Prop: ${propName}, Pos: ${position}`);
    }

    private static fromRequiredString(value: any, propName: string, position: string): string {
        if (typeof value === 'string' && value) {
            return value;
        }
        throw new Error(`Prop: ${propName}, Pos: ${position}`);
    }

    private static fromBoolean(value: any, propName: string, position: string): boolean | undefined {
        if (value === true || value === 'true') {
            return true;
        }
        if (value === false || value === 'false') {
            return false;
        }
        if (value !== undefined) {
            throw new Error(`Prop: ${propName}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromEntity(value: any): SchemaEntity {
        if (value === SchemaEntity.NONE) {
            return SchemaEntity.NONE;
        }
        if (value === SchemaEntity.VC) {
            return SchemaEntity.VC;
        }
        if (value === SchemaEntity.EVC) {
            return SchemaEntity.EVC;
        }
        throw new Error(`Prop: ${'entity'}, Pos: schema`);
    }

    // private static fromTopic(value: any): string {

    // }

    private static fromType(value: IFieldJson, all: Schema[], position: string): string {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.type;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.type;
            }
        }
        for (const subSchema of all) {
            if (value.type === subSchema.iri) {
                return subSchema.iri;
            }
        }
        throw new Error(`Prop: ${'type'}, Pos: ${position}`);
    }

    private static fromFormat(value: IFieldJson): string | undefined {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.format;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.format;
            }
        }
        return undefined;
    }

    private static fromPattern(value: IFieldJson, position: string): string | undefined {
        if (SchemaJson.equalString(value.type, 'String')) {
            return SchemaJson.fromString(value.pattern, 'pattern', position);
        }
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.pattern;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.pattern;
            }
        }
        if (value.pattern) {
            throw new Error(`Prop: ${'pattern'}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromIsRef(value: IFieldJson, all: Schema[]): boolean {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return false;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
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


    private static fromUnit(value: IFieldJson, position: string): string | undefined {
        if (SchemaJson.equalString(value.type, 'Prefix')) {
            return SchemaJson.fromString(value.unit, 'unit', position);
        }
        if (SchemaJson.equalString(value.type, 'Postfix')) {
            return SchemaJson.fromString(value.unit, 'unit', position);
        }
        return undefined;
    }

    private static fromUnitType(value: IFieldJson): UnitSystem | undefined {
        if (SchemaJson.equalString(value.type, 'Prefix')) {
            return UnitSystem.Prefix;
        }
        if (SchemaJson.equalString(value.type, 'Postfix')) {
            return UnitSystem.Postfix;
        }
        return undefined;
    }

    private static fromCustomType(value: IFieldJson): string | undefined {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.customType;
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return type.customType;
            }
        }
        return undefined;
    }

    private static fromFont(value: IFieldJson, position: string): {
        size: string | undefined;
        color: string | undefined;
        bold: boolean | undefined;
    } {
        if (SchemaJson.equalString(value.type, 'Help Text')) {
            return {
                size: SchemaJson.fromTextSize(value.textSize, position) || '18',
                color: SchemaJson.fromTextColor(value.textColor, position) || '#000000',
                bold: SchemaJson.fromBoolean(value.textBold, 'textBold', position) || false,
            }
        }
        if (value.textSize) {
            throw new Error(`Prop: ${'textSize'}, Pos: ${position}`);
        }
        if (value.textColor) {
            throw new Error(`Prop: ${'textColor'}, Pos: ${position}`);
        }
        if (value.textBold) {
            throw new Error(`Prop: ${'textBold'}, Pos: ${position}`);
        }
        return {
            size: undefined,
            color: undefined,
            bold: undefined
        }
    }

    private static fromTextSize(value: any, position: string): string | undefined {
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
            throw new Error(`Prop: ${'textSize'}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromTextColor(value: any, position: string): string | undefined {
        if (typeof value === 'string') {
            if ((new RegExp('^\#([a-fA-F0-9][a-fA-F0-9][a-fA-F0-9]){1,2}$')).test(value)) {
                return value;
            }
        }
        if (value) {
            throw new Error(`Prop: ${'textColor'}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromRequired(value: IFieldJson, position: string): {
        required: boolean,
        hidden: boolean,
        autocalculate: boolean,
    } {
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
        if (SchemaJson.equalString(required, 'None')) {
            return {
                required: false,
                hidden: false,
                autocalculate: false
            };
        }
        if (SchemaJson.equalString(required, 'Required')) {
            return {
                required: true,
                hidden: false,
                autocalculate: false
            };
        }
        if (SchemaJson.equalString(required, 'Hidden')) {
            return {
                required: false,
                hidden: true,
                autocalculate: false
            };
        }
        if (SchemaJson.equalString(required, 'Auto Calculate')) {
            return {
                required: false,
                hidden: false,
                autocalculate: true
            };
        }
        if (required) {
            throw new Error(`Prop: ${'required'}, Pos: ${position}`);
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
        position: string
    ): boolean | undefined {
        if (entity === SchemaEntity.EVC) {
            return SchemaJson.fromBoolean(value.private, 'private', position);
        }
        if (value.private !== undefined) {
            throw new Error(`Prop: ${'private'}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromEnum(value: IFieldJson, position: string): {
        enum: string[] | undefined,
        link: string | undefined,
    } {
        if (SchemaJson.equalString(value.type, 'Enum')) {
            if (Array.isArray(value.enum)) {
                const enumValue: string[] = [];
                for (let i = 0; i < value.enum.length; i++) {
                    enumValue.push(SchemaJson.fromRequiredString(value.enum[i], 'key', position))
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
                throw new Error(`Prop: ${'enum'}, Pos: ${position}`);
            }
        }
        if (value.enum) {
            throw new Error(`Prop: ${'enum'}, Pos: ${position}`);
        }
        return {
            enum: undefined,
            link: undefined
        }
    }

    private static fromExpression(value: IFieldJson, position: string): string | undefined {
        if (SchemaJson.equalString(value.type, 'Auto Calculate')) {
            return SchemaJson.fromString(value.expression, 'pattern', position);
        }
        if (value.expression) {
            throw new Error(`Prop: ${'expression'}, Pos: ${position}`);
        }
        return undefined;
    }

    private static fromExamples(value: IFieldJson, position: string): {
        examples: any[] | undefined,
        suggest: any[] | undefined,
        default: any[] | undefined,
    } {
        let examplesValue: any[] | undefined = undefined;
        let suggestValue: any[] | undefined = undefined;
        let defaultValue: any[] | undefined = undefined;

        if (value.examples) {
            if (Array.isArray(value.examples)) {
                examplesValue = value.examples;
            } else {
                throw new Error(`Prop: ${'examples'}, Pos: ${position}`);
            }
        }
        if (value.suggest) {
            if (Array.isArray(value.suggest)) {
                suggestValue = value.suggest;
            } else {
                throw new Error(`Prop: ${'suggest'}, Pos: ${position}`);
            }
        }
        if (value.default) {
            if (Array.isArray(value.default)) {
                defaultValue = value.default;
            } else {
                throw new Error(`Prop: ${'default'}, Pos: ${position}`);
            }
        }

        return {
            examples: examplesValue,
            suggest: suggestValue,
            default: defaultValue,
        }
    }

    private static fromSubFields(value: IFieldJson, all: Schema[]): SchemaField[] {
        for (const type of FieldTypesDictionary.FieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
                return [];
            }
        }
        for (const type of FieldTypesDictionary.CustomFieldTypes) {
            if (SchemaJson.equalString(value.type, type.name)) {
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

    private static fromField(value: IFieldJson, index: number, all: Schema[], entity: SchemaEntity): SchemaField {
        const field: SchemaField = {
            name: SchemaJson.fromRequiredString(value.key, 'key', `field #${index}`),
            title: SchemaJson.fromString(value.title, 'title', `field #${index}`),
            description: SchemaJson.fromRequiredString(value.description, 'description', `field #${index}`),
            property: SchemaJson.fromString(value.property, 'property', `field #${index}`) as '',
            type: SchemaJson.fromType(value, all, `field #${index}`),
            format: SchemaJson.fromFormat(value) as any,
            pattern: SchemaJson.fromPattern(value, `field #${index}`) as any,
            unit: SchemaJson.fromUnit(value, `field #${index}`) as any,
            unitSystem: SchemaJson.fromUnitType(value) as any,
            customType: SchemaJson.fromCustomType(value) as any,
            textColor: SchemaJson.fromFont(value, `field #${index}`).color,
            textSize: SchemaJson.fromFont(value, `field #${index}`).size,
            textBold: SchemaJson.fromFont(value, `field #${index}`).bold,

            required: SchemaJson.fromRequired(value, `field #${index}`).required,
            hidden: SchemaJson.fromRequired(value, `field #${index}`).hidden,
            autocalculate: SchemaJson.fromRequired(value, `field #${index}`).autocalculate,
            isArray: SchemaJson.fromBoolean(value.isArray, 'isArray', `field #${index}`) || false,
            isRef: SchemaJson.fromIsRef(value, all),
            isPrivate: SchemaJson.fromIsPrivate(value, entity, `field #${index}`),

            enum: SchemaJson.fromEnum(value, `field #${index}`).enum,
            remoteLink: SchemaJson.fromEnum(value, `field #${index}`).link,

            expression: SchemaJson.fromExpression(value, `field #${index}`),

            examples: SchemaJson.fromExamples(value, `field #${index}`).examples,
            suggest: SchemaJson.fromExamples(value, `field #${index}`).suggest,
            default: SchemaJson.fromExamples(value, `field #${index}`).default,

            fields: SchemaJson.fromSubFields(value, all),

            order: index,

            readOnly: false,
        }
        return field;
    }



    private static fromCondTarget(value: IConditionJson, fields: SchemaField[], position: string): SchemaField {
        const target = fields.find((f) => f.name === value.if?.field);
        if (!target) {
            throw new Error(`Prop: ${'field'}, Pos: ${position}`);
        }
        return target;
    }

    private static fromCondValue(value: IConditionJson, position: string): any {
        return value?.if?.value;
    }

    private static fromCondFields(
        value: IConditionJson,
        all: Schema[],
        entity: SchemaEntity,
        position: string
    ): {
        then: SchemaField[];
        else: SchemaField[];
    } {
        let thenFields: SchemaField[];
        let elseFields: SchemaField[];
        if (value.then) {
            if (Array.isArray(value.then)) {
                thenFields = SchemaJson.fromFields(value.then, all, entity);
            } else {
                throw new Error(`Prop: ${'then'}, Pos: ${position}`);
            }
        } else {
            thenFields = [];
        }
        if (value.else) {
            if (Array.isArray(value.else)) {
                elseFields = SchemaJson.fromFields(value.else, all, entity);
            } else {
                throw new Error(`Prop: ${'else'}, Pos: ${position}`);
            }
        } else {
            elseFields = [];
        }
        if (thenFields.length === 0 && elseFields.length === 0) {
            throw new Error(`Prop: ${'then or else'}, Pos: ${position}`);
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
        entity: SchemaEntity
    ): SchemaCondition {
        const condition: SchemaCondition = {
            ifCondition: {
                field: SchemaJson.fromCondTarget(value, fields, `condition #${index}`),
                fieldValue: SchemaJson.fromCondValue(value, `condition #${index}`),
            },
            thenFields: SchemaJson.fromCondFields(value, all, entity, `condition #${index}`).then,
            elseFields: SchemaJson.fromCondFields(value, all, entity, `condition #${index}`).else,
        }
        return condition;
    }

    private static fromFields(
        value: IFieldJson[],
        all: Schema[],
        entity: SchemaEntity
    ): SchemaField[] {
        const fields: SchemaField[] = [];

        if (!Array.isArray(value)) {
            throw new Error(`fields`);
        }

        for (let index = 0; index < value.length; index++) {
            const field = SchemaJson.fromField(value[index], index, all, entity);
            fields.push(field);
        }

        return fields;
    }

    private static fromConditions(
        value: IConditionJson[],
        fields: SchemaField[],
        all: Schema[],
        entity: SchemaEntity): SchemaCondition[] {
        const conditions: SchemaCondition[] = [];
        if (value) {
            if (!Array.isArray(value)) {
                throw new Error(`conditions`);
            }

            for (let index = 0; index < value.length; index++) {
                const condition = SchemaJson.fromCondition(value[index], index, fields, all, entity);
                conditions.push(condition);
            }
        }
        return conditions;
    }

    public static fromJson(json: ISchemaJson, all: Schema[]) {
        const name = SchemaJson.fromRequiredString(json.name, 'name', 'schema');
        const description = SchemaJson.fromString(json.description, 'description', 'schema');
        const entity = SchemaJson.fromEntity(json.entity);
        const fields = SchemaJson.fromFields(json.fields, all, entity);
        const conditions = SchemaJson.fromConditions(json.conditions, fields, all, entity);
        return {
            name,
            description,
            entity,
            fields,
            conditions
        }
    }
}
