import { IOwner, ISchema, ISchemaDocument, SchemaCondition, SchemaField, SchemaFieldPredicate } from '../index.js';
import { SchemaDataTypes } from '../interface/schema-document.interface.js';
import { Schema } from '../models/schema.js';
import geoJson from './geojson-schema/geo-json.js';
import { ModelHelper } from './model-helper.js';
import SentinelHubSchema from './sentinel-hub/sentinel-hub-schema.js';

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
            isUpdatable: null,
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
            default: null,
        };
        let _property = property;
        const readonly = _property.readOnly;
        if (_property.oneOf && _property.oneOf.length) {
            _property = _property.oneOf[0];
        }
        field.name = name;
        field.title = property.title || _property.title || name;
        field.description = property.description || _property.description || name;
        field.isArray = _property.type === SchemaDataTypes.array;
        field.comment = _property.$comment;
        field.examples = Array.isArray(_property.examples) ? _property.examples : null;
        field.default = _property.default;
        if (field.isArray) {
            _property = _property.items;
        }
        field.isRef = !!(_property.$ref && !_property.type);
        if (field.isRef) {
            field.type = _property.$ref;
        } else {
            field.type = _property.type ? String(_property.type) : null;
            field.format = _property.format ? String(_property.format) : null;
            field.pattern = _property.pattern ? String(_property.pattern) : null;
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
    public static parseField(name: string, prop: any, required: boolean, url: string): SchemaField {
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
            suggest,
            autocalculate,
            expression,
            isUpdatable,
            enumName,
        } = SchemaHelper.parseFieldComment(field.comment);
        field.suggest = suggest;
        if (field.isRef) {
            const { type } = SchemaHelper.parseRef(field.type);
            field.context = {
                type,
                context: [url]
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
        field.autocalculate = !!autocalculate;
        field.expression = expression;
        field.order = orderPosition || -1;
        field.isUpdatable = isUpdatable;
        field.enumName = enumName;
        return field;
    }

    /**
     * Build Field
     * @param field
     * @param name
     * @param contextURL
     * @param orderPosition
     */
    public static buildField(field: SchemaField, name: string, contextURL: string, orderPosition?: number): any {
        let item: any;
        const property: any = {};

        property.title = field.title || name;
        property.description = field.description || name;
        property.readOnly = !!field.readOnly;

        if (field.examples) {
            property.examples = field.examples;
        }
        if (field.default) {
            property.default = field.default;
        }

        if (field.isArray) {
            property.type = SchemaDataTypes.array;
            property.items = {};
            item = property.items;
        } else {
            item = property;
        }

        if (field.isRef) {
            item.$ref = field.type;
        } else {
            item.type = field.type;
            if (field.remoteLink) {
                item.$ref = field.remoteLink;
            }
            if (field.enum) {
                item.enum = field.enum;
            }
            if (field.format) {
                item.format = field.format;
            }
            if (field.pattern) {
                item.pattern = field.pattern;
            }
        }

        property.$comment = SchemaHelper.buildFieldComment(field, name, contextURL, orderPosition);

        return property;
    }

    /**
     * Parse reference
     * @param data
     */
    public static parseRef(data: string | ISchema): {
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
                    version: keys[1] || null
                };
            }
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null
            };
        } catch (error) {
            return {
                iri: null,
                type: null,
                uuid: null,
                version: null
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
        if (!document) {
            return [];
        }
        const results: SchemaCondition[] = [];

        const buildFields = (node: any) =>
            SchemaHelper.parseFields(node, context, schemaCache, document.$defs || defs) as SchemaField[];

        const predicatesFromProperties = (
            props: any,
            currentFields: SchemaField[] = fields,
            pathSoFar: string[] = []
        ): SchemaFieldPredicate[] => {
            const preds: SchemaFieldPredicate[] = [];
            for (const key of Object.keys(props || {})) {
                const rule = props[key];
                if (!rule) { continue; }
                if (Object.prototype.hasOwnProperty.call(rule, 'const')) {
                    const f = currentFields.find(x => x.name === key);
                    if (f) {
                        const fullPath = [...pathSoFar, key];
                        preds.push({
                            field: f,
                            fieldValue: rule.const,
                            fieldPath: fullPath.length > 1 ? fullPath : undefined,
                        });
                    }
                } else if (rule.properties) {
                    const refField = currentFields.find(x => x.name === key && x.isRef);
                    if (refField && (refField as any).fields?.length) {
                        preds.push(...predicatesFromProperties(
                            rule.properties,
                            (refField as any).fields,
                            [...pathSoFar, key]
                        ));
                    }
                }
            }
            return preds;
        };

        const toIfCondition = (nodeIf: any): SchemaCondition['ifCondition'] | null => {
            if (!nodeIf || typeof nodeIf !== 'object') {
                return null;
            }

            if (Array.isArray(nodeIf.anyOf)) {
                const branches = nodeIf.anyOf
                    .map((b: any) => predicatesFromProperties(b?.properties))
                    .filter(arr => arr.length > 0);

                const flat = branches.flat();
                if (flat.length === 1) {
                    return flat[0];
                }

                return { OR: flat };
            }

            if (Array.isArray(nodeIf.allOf)) {
                const parts = nodeIf.allOf
                    .map((b: any) => predicatesFromProperties(b?.properties))
                    .filter(arr => arr.length > 0);

                const flat = parts.flat();
                if (flat.length === 1) {
                    return flat[0];
                }

                return { AND: flat };
            }

            if (nodeIf.properties) {
                const preds = predicatesFromProperties(nodeIf.properties);
                if (preds.length === 0) {
                    return null;
                }
                if (preds.length === 1) {
                    return preds[0];
                }
                return { AND: preds };
            }

            return null;
        };

        const extractCrossFromLevel = (
            node: any,
            refFieldsAtLevel: SchemaField[],
            pathPrefix: string[],
        ): {
            thenTargets: Array<{ field: SchemaField; fieldPath: string[] }>;
            elseTargets: Array<{ field: SchemaField; fieldPath: string[] }>;
            cleanProps: any;
            hasCrossKeys: boolean;
        } => {
            const thenTargets: Array<{ field: SchemaField; fieldPath: string[] }> = [];
            const elseTargets: Array<{ field: SchemaField; fieldPath: string[] }> = [];
            const cleanProps: any = {};
            let hasCrossKeys = false;

            if (!node?.properties) {
                return { thenTargets, elseTargets, cleanProps: node?.properties, hasCrossKeys };
            }

            for (const key of Object.keys(node.properties)) {
                const val = node.properties[key];
                const refField = refFieldsAtLevel.find(f => f.name === key && f.isRef);
                const isCrossConstraint = refField && val && !val.$comment && !val.type && !val.$ref;
                if (isCrossConstraint) {
                    hasCrossKeys = true;
                    const childPath = [...pathPrefix, key];
                    const childFields: SchemaField[] = (refField as any).fields || [];
                    if (Array.isArray(val.required)) {
                        for (const fieldName of val.required) {
                            const childField = childFields.find(f => f.name === fieldName);
                            if (childField) {
                                thenTargets.push({ field: childField, fieldPath: [...childPath, fieldName] });
                            }
                        }
                    }
                    if (val.properties) {
                        for (const fieldName of Object.keys(val.properties)) {
                            const subVal = val.properties[fieldName];
                            if (subVal === false) {
                                const childField = childFields.find(f => f.name === fieldName);
                                if (childField) {
                                    elseTargets.push({ field: childField, fieldPath: [...childPath, fieldName] });
                                }
                            } else {
                                const subRefField = childFields.find(f => f.name === fieldName && f.isRef);
                                if (subRefField) {
                                    const subResult = extractCrossFromLevel(
                                        { properties: { [fieldName]: subVal } },
                                        childFields,
                                        childPath,
                                    );
                                    thenTargets.push(...subResult.thenTargets);
                                    elseTargets.push(...subResult.elseTargets);
                                }
                            }
                        }
                    }
                } else {
                    cleanProps[key] = val;
                }
            }
            return { thenTargets, elseTargets, cleanProps, hasCrossKeys };
        };

        const extractCrossTargets = (node: any): {
            thenTargets: Array<{ field: SchemaField; fieldPath: string[] }>;
            elseTargets: Array<{ field: SchemaField; fieldPath: string[] }>;
            cleanNode: any;
        } => {
            if (!node?.properties) {
                return { thenTargets: [], elseTargets: [], cleanNode: node };
            }
            const result = extractCrossFromLevel(node, fields, []);
            if (!result.hasCrossKeys) {
                return { thenTargets: [], elseTargets: [], cleanNode: node };
            }
            const cleanNode: any = { ...node };
            if (result.cleanProps && Object.keys(result.cleanProps).length) {
                cleanNode.properties = result.cleanProps;
                if (Array.isArray(node.required)) {
                    cleanNode.required = node.required.filter((n: string) => n in result.cleanProps);
                }
            } else {
                delete cleanNode.properties;
                delete cleanNode.required;
            }
            return {
                thenTargets: result.thenTargets,
                elseTargets: result.elseTargets,
                cleanNode: Object.keys(cleanNode).length ? cleanNode : null,
            };
        };

        const parseArray = (arr: any[]): SchemaCondition[] => {
            const out: SchemaCondition[] = [];
            for (const n of arr || []) {
                if (!n?.if) {
                    continue;
                }
                const ifCondition = toIfCondition(n.if);
                const { thenTargets, elseTargets, cleanNode: cleanThen } = extractCrossTargets(n.then);
                const { cleanNode: cleanElse } = extractCrossTargets(n.else);
                const thenFields = buildFields(cleanThen);
                const elseFields = buildFields(cleanElse);
                const condition: any = { ifCondition, thenFields, elseFields };
                if (thenTargets.length) { condition.thenTargets = thenTargets; }
                if (elseTargets.length) { condition.elseTargets = elseTargets; }
                out.push(condition as SchemaCondition);
            }
            return out;
        };

        if (Array.isArray(document.allOf)) {
            results.push(...parseArray(document.allOf));
        }
        if (Array.isArray((document as any).anyOf)) {
            results.push(...parseArray((document as any).anyOf));
        }

        return results;
    }

    /**
     * Clone a SchemaField array
     */
    private static cloneFields(fields: SchemaField[]): SchemaField[] {
        return fields.map((f) => {
            const clone: SchemaField = { ...f };
            if (Array.isArray(f.fields)) {
                clone.fields = SchemaHelper.cloneFields(f.fields);
            }
            return clone;
        });
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
            const field = SchemaHelper.parseField(name, property, !!required[name], contextURL);
            if (field.isRef) {
                if (!schemaCache.has(field.type)) {
                    const subSchemas = defs || document.$defs;
                    const subDocument = subSchemas[field.type];
                    const subFields = SchemaHelper.parseFields(
                        subDocument,
                        contextURL,
                        schemaCache,
                        subSchemas
                    );
                    const subConditions = SchemaHelper.parseConditions(
                        subDocument,
                        contextURL,
                        subFields,
                        schemaCache,
                        subSchemas
                    );
                    schemaCache.set(field.type, {
                        fields: subFields,
                        conditions: subConditions,
                    });
                }
                const subSchema = schemaCache.get(field.type);
                field.fields = SchemaHelper.cloneFields(subSchema.fields);
                field.conditions = subSchema.conditions;
            }
            if (field.order === -1) {
                fields.push(field);
            } else {
                fieldsWithPositions.push(field);
            }
        }
        fieldsWithPositions.sort((a, b) => a.order < b.order ? -1 : 1);
        return [...fields, ...fieldsWithPositions];
    }

    /**
     * Update schema fields
     * @param document
     * @param fn
     */
    public static updateFields(document: ISchemaDocument, fn: (name: string, property: any) => any): ISchemaDocument {
        if (!document || !document.properties) {
            return document;
        }
        const properties = Object.keys(document.properties);
        for (const name of properties) {
            const property = document.properties[name];
            document.properties[name] = fn(name, property);
        }
        return document;
    }

    /**
     * Build document from schema
     * @param schema
     * @param fields
     * @param conditions
     */
    public static buildDocument(schema: Schema, fields: SchemaField[], conditions: SchemaCondition[]): ISchemaDocument {
        const type = SchemaHelper.buildType(schema.uuid, schema.version);
        const ref = SchemaHelper.buildRef(type);
        const document = {
            $id: ref,
            $comment: SchemaHelper.buildSchemaComment(
                type, SchemaHelper.buildUrl(schema.contextURL, ref), schema.previousVersion
            ),
            title: schema.name,
            description: schema.description,
            type: SchemaDataTypes.object,
            properties: {
                '@context': {
                    oneOf: [
                        { type: SchemaDataTypes.string },
                        {
                            type: SchemaDataTypes.array,
                            items: { type: SchemaDataTypes.string }
                        },
                    ],
                    readOnly: true
                },
                type: {
                    oneOf: [
                        {
                            type: SchemaDataTypes.string
                        },
                        {
                            type: SchemaDataTypes.array,
                            items: {
                                type: SchemaDataTypes.string
                            }
                        },
                    ],
                    readOnly: true
                },
                id: {
                    type: SchemaDataTypes.string,
                    readOnly: true
                }
            },
            required: ['@context', 'type'],
            additionalProperties: false,
            allOf: []
        };

        const serializeIf = (cond: SchemaCondition): any => {
            const ic = cond.ifCondition;
            if (!ic) {
                return null;
            }

            const single = (p: SchemaFieldPredicate | { field: SchemaField; fieldValue: any }) => {
                const path = ('fieldPath' in p && p.fieldPath && p.fieldPath.length > 1)
                    ? p.fieldPath
                    : [p.field.name];
                let node: any = { const: p.fieldValue };
                for (let i = path.length - 1; i >= 0; i--) {
                    const wrapper: any = { properties: { [path[i]]: node } };
                    if (path.length > 1) {
                        wrapper.required = [path[i]];
                    }
                    node = wrapper;
                }
                return node;
            };

            if ('field' in ic && 'fieldValue' in ic) {
                return single(ic);
            }

            if ('AND' in ic && Array.isArray(ic.AND)) {
                if (ic.AND.length === 0) {
                    return null;
                }
                if (ic.AND.length === 1) {
                    return single(ic.AND[0]);
                }
                return {
                    allOf: ic.AND.map(p => single(p))
                };
            }

            if ('OR' in ic && Array.isArray(ic.OR)) {
                if (ic.OR.length === 0) {
                    return null;
                }
                if (ic.OR.length === 1) {
                    return single(ic.OR[0]);
                }
                return {
                    anyOf: ic.OR.map(p => single(p))
                };
            }

            return null;
        };

        const deepMergeSchemaObj = (a: any, b: any): any => {
            if (!a) { return b; }
            if (!b) { return a; }
            const result: any = { ...a };
            for (const key of Object.keys(b)) {
                if (key === 'properties') {
                    result.properties = { ...(a.properties || {}) };
                    for (const pk of Object.keys(b.properties)) {
                        result.properties[pk] = (a.properties?.[pk] !== undefined)
                            ? deepMergeSchemaObj(a.properties[pk], b.properties[pk])
                            : b.properties[pk];
                    }
                } else if (key === 'required') {
                    result.required = [...new Set([...(a.required || []), ...(b.required || [])])];
                } else {
                    result[key] = b[key];
                }
            }
            return result;
        };

        const buildCrossRequired = (targets?: { fieldPath: string[] }[]): any | undefined => {
            if (!targets?.length) { return undefined; }
            const root: any = {};
            for (const t of targets) {
                const path = t.fieldPath;
                if (!path || path.length < 2) { continue; }
                let node = root;
                for (let i = 0; i < path.length - 1; i++) {
                    if (!node.properties) { node.properties = {}; }
                    if (!node.properties[path[i]]) { node.properties[path[i]] = {}; }
                    node = node.properties[path[i]];
                }
                const fieldName = path[path.length - 1];
                if (!node.required) { node.required = []; }
                if (!node.required.includes(fieldName)) { node.required.push(fieldName); }
            }
            return Object.keys(root).length ? root : undefined;
        };

        const buildCrossForbidden = (targets?: { fieldPath: string[] }[]): any | undefined => {
            if (!targets?.length) { return undefined; }
            const root: any = {};
            for (const t of targets) {
                const path = t.fieldPath;
                if (!path || path.length < 2) { continue; }
                let node = root;
                for (let i = 0; i < path.length - 1; i++) {
                    if (!node.properties) { node.properties = {}; }
                    if (!node.properties[path[i]]) { node.properties[path[i]] = {}; }
                    node = node.properties[path[i]];
                }
                const fieldName = path[path.length - 1];
                if (!node.properties) { node.properties = {}; }
                node.properties[fieldName] = false;
            }
            return Object.keys(root).length ? root : undefined;
        };

        const serializeCondition = (cond: SchemaCondition) => {
            const ifNode = serializeIf(cond);
            if (!ifNode) {
                return null;
            }

            const buildSub = (sub?: SchemaField[]) => {
                const req: string[] = [];
                const props: any = {};
                SchemaHelper.getFieldsFromObject(sub || [], req, props, schema.contextURL);
                return Object.keys(props).length ? { properties: props, required: req } : undefined;
            };

            const thenObj = deepMergeSchemaObj(
                deepMergeSchemaObj(buildSub(cond.thenFields), buildCrossRequired(cond.thenTargets)),
                buildCrossForbidden(cond.elseTargets)
            );
            const elseObj = deepMergeSchemaObj(
                deepMergeSchemaObj(buildSub(cond.elseFields), buildCrossRequired(cond.elseTargets)),
                buildCrossForbidden(cond.thenTargets)
            );

            const obj: any = { if: ifNode };
            if (thenObj) {
                obj.then = thenObj;
            }
            if (elseObj) {
                obj.else = elseObj;
            }
            return obj;
        };

        const conditionNodes = (conditions || [])
            .map(serializeCondition)
            .filter(Boolean);

        if (conditionNodes.length) {
            (document as any).allOf = conditionNodes;
        } else {
            delete (document as any).allOf;
        }

        SchemaHelper.getFieldsFromObject(fields, document.required, document.properties, schema.contextURL);

        const conditionFieldNames = new Set<string>();
        for (const cond of (conditions || [])) {
            for (const f of (cond.thenFields || [])) { conditionFieldNames.add(f.name); }
            for (const f of (cond.elseFields || [])) { conditionFieldNames.add(f.name); }
        }
        if (conditionFieldNames.size && Array.isArray(document.required)) {
            document.required = document.required.filter((name: string) => !conditionFieldNames.has(name));
        }

        return document;
    }

    /**
     * Build Field comment
     * @param field
     * @param name
     * @param url
     * @param orderPosition
     */
    public static buildFieldComment(field: SchemaField, name: string, url: string, orderPosition?: number): string {
        const comment: any = {};
        comment.term = name;
        comment['@id'] = field.isRef ?
            SchemaHelper.buildUrl(url, field.type) :
            'https://www.schema.org/text';
        if (![null, undefined].includes(field.isPrivate)) {
            comment.isPrivate = field.isPrivate;
        }
        if (field.unit) {
            comment.unit = field.unit;
        }
        if (field.unitSystem) {
            comment.unitSystem = field.unitSystem;
        }
        if (field.property) {
            comment.property = field.property;
        }
        if (field.customType) {
            comment.customType = field.customType;
        }
        if (field.textColor) {
            comment.textColor = field.textColor;
        }
        if (field.textSize) {
            comment.textSize = field.textSize;
        }
        if (field.textBold) {
            comment.textBold = field.textBold;
        }
        if (field.availableOptions) {
            comment.availableOptions = field.availableOptions;
        }
        if (Number.isInteger(orderPosition) && orderPosition >= 0) {
            comment.orderPosition = orderPosition;
        }
        if (field.hidden) {
            comment.hidden = !!field.hidden;
        }
        if (field.suggest) {
            comment.suggest = field.suggest;
        }
        if (field.autocalculate) {
            comment.autocalculate = field.autocalculate;
        }
        if (field.expression) {
            comment.expression = field.expression;
        }
        if (field.isUpdatable) {
            comment.isUpdatable = field.isUpdatable;
        }
        if (field.enumName) {
            comment.enumName = field.enumName;
        }
        return JSON.stringify(comment);
    }

    /**
     * Build type
     * @param uuid
     * @param version
     */
    public static buildType(uuid: string, version?: string): string {
        const type = uuid;
        if (version) {
            return `${type}&${version}`;
        }
        return type;
    }

    /**
     * Build reference
     * @param type
     */
    public static buildRef(type: string): string {
        return `#${type}`;
    }

    /**
     * Build URL
     * @param contextURL
     * @param ref
     */
    public static buildUrl(contextURL: string, ref: string): string {
        return `${contextURL || ''}${ref || ''}`;
    }

    /**
     * Get version
     * @param data
     */
    public static getVersion(data: ISchema) {
        try {
            let document = data.document;
            if (typeof document === 'string') {
                document = JSON.parse(document) as ISchemaDocument;
            }
            const { version } = SchemaHelper.parseRef(document.$id);
            const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);
            return { version, previousVersion };
        } catch (error) {
            return { version: null, previousVersion: null }
        }
    }

    /**
     * Set version
     * @param data
     * @param version
     * @param previousVersion
     */
    public static setVersion(data: ISchema, version: string, previousVersion: string) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }
        const uuid = data.uuid;
        const type = SchemaHelper.buildType(uuid, version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
        data.version = version;
        data.document = document;
        return data;
    }

    /**
     * Update version
     * @param data
     * @param newVersion
     */
    public static updateVersion(data: ISchema, newVersion: string) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }

        const { uuid } = SchemaHelper.parseRef(document.$id);
        const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);

        const _owner = data.creator || data.owner;
        const _uuid = data.uuid || uuid;

        if (!ModelHelper.checkVersionFormat(newVersion)) {
            throw new Error('Invalid version format');
        }

        if (ModelHelper.versionCompare(newVersion, previousVersion) <= 0) {
            throw new Error('Version must be greater than ' + previousVersion);
        }

        data.version = newVersion;
        data.owner = _owner;
        data.creator = _owner;
        data.uuid = _uuid;

        const type = SchemaHelper.buildType(_uuid, newVersion);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
        data.document = document;
        return data;
    }

    /**
     * Update owner
     * @param data
     * @param newOwner
     */
    public static updateOwner(data: ISchema, newOwner: IOwner) {
        let document = data.document;
        if (typeof document === 'string') {
            document = JSON.parse(document) as ISchemaDocument;
        }

        const { version, uuid } = SchemaHelper.parseRef(document.$id);
        const { previousVersion } = SchemaHelper.parseSchemaComment(document.$comment);
        data.version = data.version || version;
        data.uuid = data.uuid || uuid;
        data.owner = newOwner.owner || newOwner.username;
        data.creator = newOwner.creator || newOwner.username;
        const type = SchemaHelper.buildType(data.uuid, data.version);
        const ref = SchemaHelper.buildRef(type);
        document.$id = ref;
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion
        );
        data.document = document;
        return data;
    }

    /**
     * Update permission
     * @param data
     * @param did
     */
    public static updatePermission(data: ISchema[], owner: IOwner) {
        for (const element of data) {
            element.isOwner = element.owner && element.owner === owner.owner;
            element.isCreator = element.creator && element.creator === owner.creator;
        }
    }

    /**
     * Map schemas
     * @param data
     */
    public static map(data: ISchema[]): Schema[] {
        if (data) {
            return data.map(e => new Schema(e));
        }
        return [];
    }

    /**
     * Validate schema
     * @param schema
     */
    public static validate(schema: ISchema) {
        try {
            if (!schema.name) {
                return false;
            }
            if (!schema.uuid) {
                return false;
            }
            if (!schema.document) {
                return false;
            }
            let doc = schema.document;
            if (typeof doc === 'string') {
                doc = JSON.parse(doc) as ISchemaDocument;
            }
            if (!doc.$id) {
                return false;
            }
        } catch (error) {
            return false;
        }
        return true;
    }

    /**
     * Find references
     * @param target
     * @param schemas
     */
    public static findRefs(target: Schema, schemas: Schema[]) {
        const map = {};
        const schemaMap: Record<string, any> = {
            '#GeoJSON': geoJson,
            '#SentinelHUB': SentinelHubSchema
        };
        for (const element of schemas) {
            schemaMap[element.iri] = element.document;
        }
        for (const field of target.fields) {
            if (field.isRef && schemaMap[field.type]) {
                map[field.type] = schemaMap[field.type];
            }
        }

        const patchMap = SchemaHelper.buildCrossTargetPatchMap(target, schemaMap);
        return SchemaHelper.uniqueRefs(map, {}, patchMap);
    }

    /**
     * Build a map from sub-schema IRI → set of field names to strip from required,
     * derived from cross-schema condition targets on the given schema.
     */
    private static buildCrossTargetPatchMap(
        target: Schema,
        schemaMap: Record<string, any>
    ): Map<string, Set<string>> {
        const patchMap = new Map<string, Set<string>>();
        const fieldNameToIRI = new Map<string, string>();
        for (const field of target.fields) {
            if (field.isRef && field.type) {
                fieldNameToIRI.set(field.name, field.type);
            }
        }
        for (const condition of (target.conditions || [])) {
            const allTargets = [
                ...(condition.thenTargets || []),
                ...(condition.elseTargets || []),
            ];
            for (const t of allTargets) {
                const path = t.fieldPath;
                if (!path || path.length < 2) { continue; }
                let iri: string | undefined = fieldNameToIRI.get(path[0]);
                for (let i = 1; i < path.length - 1 && iri; i++) {
                    iri = schemaMap[iri]?.properties?.[path[i]]?.['$ref'];
                }
                if (!iri) { continue; }
                const leaf = path[path.length - 1];
                if (!patchMap.has(iri)) { patchMap.set(iri, new Set()); }
                patchMap.get(iri)!.add(leaf);
            }
        }
        return patchMap;
    }

    /**
     * Get unique refs
     * @param map
     * @param newMap
     * @param patchMap fields to strip from required per schema IRI
     * @private
     */
    private static uniqueRefs(map: any, newMap: any, patchMap?: Map<string, Set<string>>) {
        const keys = Object.keys(map);
        for (const iri of keys) {
            if (!newMap[iri]) {
                const oldSchema = map[iri];
                const newSchema = { ...oldSchema };
                delete newSchema.$defs;
                const toRemove = patchMap?.get(iri);
                if (toRemove?.size && Array.isArray(newSchema.required)) {
                    newSchema.required = newSchema.required.filter((r: string) => !toRemove.has(r));
                }
                newMap[iri] = newSchema;
                if (oldSchema.$defs) {
                    SchemaHelper.uniqueRefs(oldSchema.$defs, newMap, patchMap);
                }
            }
        }
        return newMap;
    }

    /**
     * Get context
     * @param item
     */
    public static getContext(item: ISchema): {
        /**
         * Type
         */
        'type': string,
        /**
         * Context
         */
        '@context': string[]
    } {
        try {
            const { type } = SchemaHelper.parseRef(item.iri);
            return {
                'type': type,
                '@context': [item.contextURL]
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Increment version
     * @param previousVersion
     * @param versions
     */
    public static incrementVersion(previousVersion: string, versions: string[]) {
        const map = {};
        versions.push(previousVersion);
        for (const element of versions) {
            if (!element) {
                continue
            }
            const _index = element.lastIndexOf('.');
            const _max = element.slice(0, _index);
            const _min = parseInt(element.slice(_index + 1), 10);
            if (map[_max]) {
                map[_max] = Math.max(map[_max], _min);
            } else {
                map[_max] = _min;
            }
        }
        if (!previousVersion) {
            previousVersion = '1.0.0';
        }
        const index = previousVersion.lastIndexOf('.');
        const max = previousVersion.slice(0, index);
        return max + '.' + ((map[max] ?? -1) + 1);
    }

    /**
     * Update IRI
     * @param schema
     */
    public static updateIRI(schema: ISchema): ISchema {
        try {
            if (schema.document) {
                let document = schema.document;
                if (typeof document === 'string') {
                    document = JSON.parse(document) as ISchemaDocument;
                }
                schema.iri = document.$id || null;
            } else {
                const type = SchemaHelper.buildType(schema.uuid, schema.version);
                const ref = SchemaHelper.buildRef(type);
                schema.iri = ref;
            }
            return schema;
        } catch (error) {
            schema.iri = null;
            return schema;
        }
    }

    /**
     * Update fields context
     * @param fields
     * @param json
     * @param parent
     * @private
     */
    private static _updateFieldsContext(
        fields: SchemaField[],
        json: any,
        parent?: SchemaField
    ): any {
        if (Object.prototype.toString.call(json) === '[object Array]') {
            for (const item of json) {
                SchemaHelper._updateFieldsContext(fields, item, parent);
            }
            return json;
        }

        if (Object.prototype.toString.call(json) !== '[object Object]') {
            return json;
        }

        if (parent) {
            if (parent.context.type === 'GeoJSON') {
                json['@context'] = parent.context.context;
            } else {
                json.type = parent.context.type;
                json['@context'] = parent.context.context;
            }
        } else {
            delete json.type;
            delete json['@context'];
        }

        for (const field of fields) {
            const value = json[field.name];
            if (field.isRef && value) {
                SchemaHelper._updateFieldsContext(field.fields, value, field);
            } else if (
                Object.prototype.toString.call(value) === '[object Object]'
            ) {
                delete value.type;
                delete value['@context'];
            }
        }

        return json;
    }

    /**
     * Update object context
     * @param schema
     * @param json
     */
    public static updateObjectContext(schema: Schema, json: any): any {
        json = SchemaHelper._updateFieldsContext(schema.fields, json);
        json.type = schema.type;
        json['@context'] = [schema.contextURL];
        return json;
    }

    /**
     * Get fields from object
     * @param fields
     * @param required
     * @param properties
     * @param contextURL
     * @private
     */
    private static getFieldsFromObject(fields: SchemaField[], required: string[], properties: any, contextURL: string) {
        const fieldsWithoutSystemFields = fields.filter(item => !item.readOnly);
        for (const field of fields) {
            const property = SchemaHelper.buildField(field, field.name, contextURL, fieldsWithoutSystemFields.indexOf(field));
            if (/\s/.test(field.name)) {
                throw new Error(`Field key '${field.name}' must not contain spaces`);
            }
            if (properties[field.name]) {
                continue;
            }
            if (field.required) {
                required.push(field.name);
            }
            properties[field.name] = property;
        }
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
     * Build Schema comment
     * @param type
     * @param url
     * @param version
     */
    public static buildSchemaComment(type: string, url: string, version?: string): string {
        if (version) {
            return `{ "@id": "${url}", "term": "${type}", "previousVersion": "${version}" }`;
        }
        return `{ "@id": "${url}", "term": "${type}" }`;
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

    /**
     * Check Schema Key
     * @param schema
     * @private
     */
    public static checkSchemaKey(schema: ISchema): boolean {
        if (schema?.document?.properties) {
            for (const key in schema?.document?.properties) {
                if (/\s/.test(key)) {
                    throw new Error(`Field key '${key}' must not contain spaces`);
                }
            }
        }
        return true;
    }

    /**
     * Get schema name with detailed information
     * @param name Name
     * @param version Version
     * @param status Status
     * @returns Name
     */
    public static getSchemaName(
        name?: string,
        version?: string,
        status?: string
    ) {
        let result = name || '';
        if (version) {
            result += ` (${version})`;
        }
        if (status) {
            result += ` (${status})`;
        }
        return result;
    }

    /**
     * Get schema name with detailed information
     * @param name Name
     * @param version Version
     * @param status Status
     * @returns Name
     */
    public static checkErrors(schema: Schema): any[] {
        const errors = [];
        if (Array.isArray(schema.errors)) {
            for (const error of schema.errors) {
                errors.push({
                    target: {
                        type: 'schema'
                    },
                    ...error
                });
            }
        }
        if (Array.isArray(schema.fields)) {
            for (const field of schema.fields) {
                if (Array.isArray(field.errors)) {
                    for (const error of field.errors) {
                        errors.push({
                            ...error,
                            target: {
                                type: 'field',
                                field: field.name,
                            }
                        });
                    }
                }
            }
        }
        const normalizeIfCondition = (ifCondition: any): {
            mode: 'IF' | 'AND' | 'OR',
            field?: string,
            fieldValue?: any,
            predicates?: { field: string, value: any }[]
        } | null => {
            if (!ifCondition) {
                return null;
            }

            if (Array.isArray(ifCondition.AND)) {
                return {
                    mode: 'AND',
                    predicates: ifCondition.AND
                        .filter((p: any) => p?.field?.name)
                        .map((p: any) => ({ field: p.field.name, fieldValue: p.fieldValue }))
                };
            }
            if (Array.isArray(ifCondition.OR)) {
                return {
                    mode: 'OR',
                    predicates: ifCondition.OR
                        .filter((p: any) => p?.field?.name)
                        .map((p: any) => ({ field: p.field.name, fieldValue: p.fieldValue }))
                };
            }

            if (ifCondition.field?.name !== undefined) {
                return {
                    mode: 'IF',
                    field: ifCondition.field.name,
                    fieldValue: ifCondition.fieldValue
                };
            }

            if (Array.isArray(ifCondition.predicates) && ifCondition.predicates.length) {
                const mode = ifCondition.op === 'ANY_OF' ? 'OR' : 'AND';
                const preds = ifCondition.predicates
                    .filter((p: any) => p?.field?.name)
                    .map((p: any) => ({ field: p.field.name, value: p.value }));
                if (preds.length === 1) {
                    return { mode: 'IF', field: preds[0].field, fieldValue: preds[0].value };
                }
                return { mode, predicates: preds };
            }

            return null;
        };

        if (Array.isArray(schema.conditions)) {
            schema.conditions.forEach((condition: any, idx: number) => {
                if (Array.isArray(condition.errors)) {
                    const norm = normalizeIfCondition(condition.ifCondition);
                    for (const error of condition.errors) {
                        const target: any = { type: 'condition', index: idx };

                        if (norm) {
                            target.mode = norm.mode;
                            if (norm.mode === 'IF') {
                                target.field = norm.field;
                                target.fieldValue = norm.fieldValue;
                            } else {
                                target.predicates = norm.predicates || [];
                            }
                        } else {
                            target.mode = 'IF';
                            target.field = condition?.ifCondition?.field?.name;
                            target.fieldValue = condition?.ifCondition?.fieldValue;
                        }

                        errors.push({
                            ...error,
                            target
                        });
                    }
                }
            });
        }
        return errors;
    }
}
