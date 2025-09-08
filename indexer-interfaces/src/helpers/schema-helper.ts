import {
    ISchemaDocument,
    SchemaCondition,
    SchemaField,
    SchemaDataTypes,
} from '../interfaces/index.js';

/**
 * Schema helper class
 */
export class SchemaHelper {
    /**
     * Parse Property
     * @param name
     * @param property
     */
    public static parseProperty(name: string, property: any): SchemaField {
        const field: SchemaField = {
            name: null,
            title: null,
            description: null,
            type: null,
            format: null,
            pattern: null,
            unit: null,
            unitSystem: null,
            property: null,
            isArray: null,
            isRef: null,
            readOnly: null,
            required: null,
            fields: null,
            conditions: null,
            context: null,
            customType: null,
            comment: null,
            isPrivate: null,
            examples: null,
        };
        let _property = property;
        const readonly = _property.readOnly;
        if (_property.oneOf && _property.oneOf.length) {
            _property = _property.oneOf[0];
        }
        field.name = name;
        field.title = _property.title || name;
        field.description = _property.description || name;
        field.isArray = _property.type === SchemaDataTypes.array;
        field.comment = _property.$comment;
        field.examples = Array.isArray(_property.examples)
            ? _property.examples
            : null;
        if (field.isArray) {
            _property = _property.items;
        }
        field.isRef = !!(_property.$ref && !_property.type);
        if (field.isRef) {
            field.type = _property.$ref;
        } else {
            field.type = _property.type ? String(_property.type) : null;
            field.format = _property.format ? String(_property.format) : null;
            field.pattern = _property.pattern
                ? String(_property.pattern)
                : null;
            field.enum = _property.enum;
            field.remoteLink = _property.$ref;
        }
        field.readOnly = !!(_property.readOnly || readonly);
        return field;
    }

    /**
     * Parse Field
     * @param name
     * @param property
     * @param required
     * @param hidden
     * @param url
     */
    public static parseField(
        name: string,
        prop: any,
        required: boolean,
        url: string
    ): SchemaField {
        const field: SchemaField = SchemaHelper.parseProperty(name, prop);
        const {
            unit,
            unitSystem,
            property,
            customType,
            textColor,
            textSize,
            textBold,
            orderPosition,
            availableOptions,
            isPrivate,
            hidden,
        } = SchemaHelper.parseFieldComment(field.comment);
        if (field.isRef) {
            const { type } = SchemaHelper.parseRef(field.type);
            field.context = {
                type,
                context: [url],
            };
        } else {
            field.unit = unit ? String(unit) : null;
            field.unitSystem = unitSystem ? String(unitSystem) : null;
            field.textColor = textColor;
            field.textSize = textSize;
            field.textBold = textBold;
            if (textColor) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.color = textColor;
            }
            if (textSize) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.size = textSize;
            }
            if (textBold) {
                if (!field.font) {
                    field.font = {};
                }
                field.font.bold = textBold;
            }
        }
        field.availableOptions = availableOptions;
        field.property = property ? String(property) : null;
        field.customType = customType ? String(customType) : null;
        field.isPrivate = isPrivate;
        field.required = required;
        field.hidden = !!hidden;
        field.order = orderPosition || -1;
        return field;
    }

    /**
     * Parse reference
     * @param data
     */
    public static parseRef(data: any): {
        /**
         * Schema iri
         */
        iri: string | null;
        /**
         * Schema type
         */
        type: string | null;
        /**
         * Schema UUID
         */
        uuid: string | null;
        /**
         * Schema version
         */
        version: string | null;
    } {
        try {
            let ref: string;
            if (typeof data === 'string') {
                ref = data;
            } else {
                let document = data.document;
                if (typeof document === 'string') {
                    document = JSON.parse(document) as ISchemaDocument;
                }
                ref = document.$id;
            }
            if (ref) {
                const id = ref.split('#');
                const keys = id[id.length - 1].split('&');
                return {
                    iri: ref,
                    type: id[id.length - 1],
                    uuid: keys[0] || null,
                    version: keys[1] || null,
                };
            }
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null,
            };
        } catch (error) {
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null,
            };
        }
    }

    /**
     * Parse conditions
     * @param document
     * @param context
     * @param fields
     * @param defs
     */
    public static parseConditions(
        document: ISchemaDocument,
        context: string,
        fields: SchemaField[],
        schemaCache: Map<string, any>,
        defs: any = null
    ): SchemaCondition[] {
        const conditions: SchemaCondition[] = [];

        if (!document || !document.allOf) {
            return conditions;
        }

        const allOf = Object.keys(document.allOf);
        for (const oneOf of allOf) {
            const condition = document.allOf[oneOf];
            if (!condition.if) {
                continue;
            }

            const ifConditionFieldName = Object.keys(
                condition.if.properties
            )[0];

            const conditionToAdd: SchemaCondition = {
                ifCondition: {
                    field: fields.find(
                        (field) => field.name === ifConditionFieldName
                    ),
                    fieldValue:
                        condition.if.properties[ifConditionFieldName].const,
                },
                thenFields: SchemaHelper.parseFields(
                    condition.then,
                    context,
                    schemaCache,
                    document.$defs || defs
                ) as SchemaField[],
                elseFields: SchemaHelper.parseFields(
                    condition.else,
                    context,
                    schemaCache,
                    document.$defs || defs
                ) as SchemaField[],
            };

            conditions.push(conditionToAdd);
        }

        return conditions;
    }

    /**
     * Parse fields
     * @param document
     * @param contextURL
     * @param defs
     * @param includeSystemProperties
     */
    public static parseFields(
        document: ISchemaDocument,
        contextURL: string,
        schemaCache: Map<string, any>,
        defs?: any,
        includeSystemProperties: boolean = false
    ): SchemaField[] {
        const fields: SchemaField[] = [];
        const fieldsWithPositions: SchemaField[] = [];

        if (!document || !document.properties) {
            return fields;
        }

        const required = {};
        if (document.required) {
            for (const element of document.required) {
                required[element] = true;
            }
        }

        const properties = Object.keys(document.properties);
        for (const name of properties) {
            const property = document.properties[name];
            if (!includeSystemProperties && property.readOnly) {
                continue;
            }
            const field = SchemaHelper.parseField(
                name,
                property,
                !!required[name],
                contextURL
            );
            if (field.isRef) {
                if (schemaCache.has(field.type)) {
                    const schema = schemaCache.get(field.type);
                    field.fields = schema.fields;
                    field.conditions = schema.conditions;
                } else {
                    const subSchemas = defs || document.$defs;
                    const subDocument = subSchemas[field.type];
                    const subFields = SchemaHelper.parseFields(
                        subDocument,
                        contextURL,
                        schemaCache,
                        subSchemas
                    );
                    const conditions = SchemaHelper.parseConditions(
                        subDocument,
                        contextURL,
                        subFields,
                        schemaCache,
                        subSchemas
                    );
                    field.fields = subFields;
                    field.conditions = conditions;
                    schemaCache.set(field.type, {
                        fields: field.fields,
                        conditions: field.conditions,
                    });
                }
            }
            if (field.order === -1) {
                fields.push(field);
            } else {
                fieldsWithPositions.push(field);
            }
        }
        fieldsWithPositions.sort((a, b) => (a.order < b.order ? -1 : 1));
        return [...fields, ...fieldsWithPositions];
    }

    /**
     * Parse Field comment
     * @param comment
     */
    public static parseFieldComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Parse Schema comment
     * @param comment
     */
    public static parseSchemaComment(comment: string): any {
        try {
            const item = JSON.parse(comment);
            return item || {};
        } catch (error) {
            return {};
        }
    }
}
