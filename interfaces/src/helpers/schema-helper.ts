import { GenerateUUIDv4, IOwner, ISchema, ISchemaDocument, SchemaCondition, SchemaField, SchemaFieldPredicate, ISchemaArrayDependency } from '../index.js';

import { SchemaDataTypes } from '../interface/schema-document.interface.js';
import { IIwaFieldRemap, IIwaUpgradeReport, mapIwaPathV1ToV3 } from '../type/iwa-version.type.js';
import { Schema } from '../models/schema.js';
import geoJson from './geojson-schema/geo-json.js';
import { ModelHelper } from './model-helper.js';
import SentinelHubSchema from './sentinel-hub/sentinel-hub-schema.js';

/**
 * Schema helper class
 */
export class SchemaHelper {
    private static readonly SCHEMA_FIELD_RUNTIME_KEYS = new Set([
        'path',
        'fullPath',
        'fullType',
        'arrayLvl',
        'errors'
    ]);

    /**
     * Clone schema values without runtime-only field properties and circular references.
     * @param value
     * @param ignoredKeys
     * @param seen
     */
    public static cloneSchemaRuntimeValue(
        value: any,
        ignoredKeys: Set<string> = SchemaHelper.SCHEMA_FIELD_RUNTIME_KEYS,
        seen: WeakSet<object> = new WeakSet()
    ): any {
        if (!value || typeof value !== 'object') {
            return value;
        }
        if (seen.has(value)) {
            return undefined;
        }
        seen.add(value);
        try {
            if (Array.isArray(value)) {
                return value
                    .map((item) => SchemaHelper.cloneSchemaRuntimeValue(item, ignoredKeys, seen))
                    .filter((item) => item !== undefined);
            }
            const result: any = {};
            for (const [key, child] of Object.entries(value)) {
                if (ignoredKeys.has(key) || child === undefined) {
                    continue;
                }
                const cloned = SchemaHelper.cloneSchemaRuntimeValue(child, ignoredKeys, seen);
                if (cloned !== undefined) {
                    result[key] = cloned;
                }
            }
            return result;
        } finally {
            seen.delete(value);
        }
    }

    /**
     * Stable JSON stringifier for hash and equality checks.
     * @param value
     */
    public static stableStringify(value: any): string {
        if (Array.isArray(value)) {
            return `[${value.map((item) => SchemaHelper.stableStringify(item)).join(',')}]`;
        }
        if (value && typeof value === 'object') {
            const entries = Object.keys(value)
                .filter((key) => value[key] !== undefined)
                .sort()
                .map((key) => `${JSON.stringify(key)}:${SchemaHelper.stableStringify(value[key])}`);
            return `{${entries.join(',')}}`;
        }
        return JSON.stringify(value);
    }

    /**
     * Walk through every JSON schema property, including nested object and array item properties.
     * @param document
     * @param visitor
     * @param path
     */
    public static walkDocumentProperties(
        document: any,
        visitor: (property: any, path: string[], name: string) => void,
        path: string[] = []
    ): void {
        if (!document || typeof document !== 'object') {
            return;
        }
        const properties = document.properties;
        if (!properties || typeof properties !== 'object') {
            return;
        }
        for (const [name, property] of Object.entries<any>(properties)) {
            const fieldPath = [...path, name];
            visitor(property, fieldPath, name);
            const target = property?.type === SchemaDataTypes.array ? property.items : property;
            SchemaHelper.walkDocumentProperties(target, visitor, fieldPath);
        }
    }

    /**
     * Resolve the object that carries a field's $comment.
     *
     * Mirrors parseProperty(): a oneOf wrapper is unwrapped first, and for an
     * array the comment stays on the outer level rather than on items.
     */
    private static getCommentTarget(property: any): any {
        if (property && Array.isArray(property.oneOf) && property.oneOf.length) {
            return property.oneOf[0];
        }
        return property;
    }

    /**
     * Remap every IWA property path in a schema document from v1 to v3.
     *
     * Walks nested objects and array items, not just top-level properties, so
     * a property buried inside an array of objects is remapped too.
     *
     * With apply=false the document is left untouched and only the report is
     * produced, which is what the confirmation dialog is built from. With
     * apply=true the document is mutated in place: renamed properties are
     * rewritten and properties v3 dropped are cleared.
     */
    public static remapIwaPropertiesToV3(
        document: ISchemaDocument,
        apply: boolean
    ): IIwaUpgradeReport {
        const report: IIwaUpgradeReport = { unchanged: [], renamed: [], unmappable: [] };
        SchemaHelper.walkDocumentProperties(document, (property, path) => {
            const target = SchemaHelper.getCommentTarget(property);
            if (!target || !target.$comment) {
                return;
            }
            const comment = SchemaHelper.parseSchemaComment(target.$comment);
            const from = comment?.property;
            if (!from) {
                return;
            }
            const to = mapIwaPathV1ToV3(String(from));
            const entry: IIwaFieldRemap = { field: path.join('.'), from: String(from), to };
            if (to === null) {
                report.unmappable.push(entry);
                if (apply) {
                    delete comment.property;
                    target.$comment = JSON.stringify(comment);
                }
                return;
            }
            if (to === from) {
                report.unchanged.push(entry);
                return;
            }
            report.renamed.push(entry);
            if (apply) {
                comment.property = to;
                target.$comment = JSON.stringify(comment);
            }
        });
        return report;
    }

    /**
     * Collect template field ids by field path and as a set.
     * @param document
     */
    public static collectTemplateFieldIds(document: any): {
        byPath: Map<string, string>,
        ids: Set<string>
    } {
        const byPath = new Map<string, string>();
        const ids = new Set<string>();
        SchemaHelper.walkDocumentProperties(document, (property, path) => {
            if (property?.templateFieldId) {
                const id = String(property.templateFieldId);
                byPath.set(path.join('.'), id);
                ids.add(id);
            }
        });
        return { byPath, ids };
    }

    /**
     * Create stable template field ids for every field in a template schema.
     * @param document
     * @param previousDocument
     */
    public static prepareTemplateFieldIds(document: any, previousDocument?: any): void {
        SchemaHelper.syncTemplateFieldIds(document, previousDocument, true);
    }

    /**
     * Preserve template field ids for fields copied from a template schema.
     * @param document
     * @param previousDocument
     */
    public static preserveTemplateFieldIds(document: any, previousDocument?: any): void {
        SchemaHelper.syncTemplateFieldIds(document, previousDocument, false);
    }

    /**
     * Remove all template field ids from a schema document.
     * @param document
     */
    public static removeTemplateFieldIds(document: any): void {
        SchemaHelper.walkDocumentProperties(document, (property) => {
            delete property.templateFieldId;
        });
    }

    /**
     * Ensure every field in a template schema has a template field id.
     * @param document
     */
    public static ensureTemplateFieldIds(document: any): boolean {
        let changed = false;
        SchemaHelper.walkDocumentProperties(document, (property) => {
            if (!property.templateFieldId) {
                property.templateFieldId = GenerateUUIDv4();
                changed = true;
            }
        });
        return changed;
    }

    private static syncTemplateFieldIds(
        document: any,
        previousDocument: any,
        createMissing: boolean
    ): void {
        const previous = SchemaHelper.collectTemplateFieldIds(previousDocument);
        SchemaHelper.walkDocumentProperties(document, (property, path) => {
            const incoming = property?.templateFieldId ? String(property.templateFieldId) : '';
            const previousByPath = previous.byPath.get(path.join('.'));
            if (incoming && previous.ids.has(incoming)) {
                property.templateFieldId = incoming;
            } else if (previousByPath) {
                property.templateFieldId = previousByPath;
            } else if (createMissing) {
                property.templateFieldId = GenerateUUIDv4();
            } else {
                delete property.templateFieldId;
            }
        });
    }

    /**
     * Parse Property
     * @param name
     * @param property
     */
    public static parseProperty(name: string, property: any): SchemaField {
        const field: SchemaField = {
            name: null,
            templateFieldId: null,
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
        field.templateFieldId = property.templateFieldId || _property.templateFieldId || null;
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
            dependency,
            enumName,
            conditionRequired,
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
        field.dependency = dependency && dependency.on ? dependency : null;
        field.isPrivate = isPrivate;
        // A field a condition reveals carries its required flag in `$comment` rather than in
        // the branch's `required` array: JSON Schema applies `else` whenever `if` fails, so a
        // branch `required` would demand fields of a condition that was never asked. See
        // `validateConditionFields`, which enforces the flag against the active branch.
        field.required = required || !!conditionRequired;
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
        if (field.templateFieldId) {
            property.templateFieldId = field.templateFieldId;
        }

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
     * Record in a property's `$comment` that the field is required by the condition branch
     * that declares it.
     *
     * `$comment` is an annotation keyword, so ajv ignores it — which is the point: the flag
     * has to survive a save/parse round trip without letting JSON Schema demand the field
     * from a branch that was never asked.
     * @param property property node of a branch
     */
    public static markConditionRequired(property: any): void {
        if (!property || typeof property !== 'object') {
            return;
        }
        const comment = SchemaHelper.parseFieldComment(property.$comment);
        comment.conditionRequired = true;
        property.$comment = JSON.stringify(comment);
    }

    /**
     * The predicates a condition's `if` reads, as single field names.
     *
     * Multi-segment (cross-schema) paths are returned as null: which branch of which
     * sub-schema reveals them is not knowable from this schema's condition list, so they
     * are treated as always readable.
     * @param condition
     */
    public static getConditionPredicates(condition: SchemaCondition): (string | null)[] {
        const ic: any = condition?.ifCondition;
        if (!ic) {
            return [];
        }
        const name = (p: any): string | null => {
            if (p?.fieldPath?.length > 1) {
                return null;
            }
            return p?.field?.name ?? null;
        };
        if (Array.isArray(ic.AND)) {
            return ic.AND.map(name);
        }
        if (Array.isArray(ic.OR)) {
            return ic.OR.map(name);
        }
        return [name(ic)];
    }

    /**
     * True when a condition's `if` is answered by any single predicate rather than all of
     * them, which changes how its reachability combines.
     * @param condition
     */
    public static isConditionDisjunctive(condition: SchemaCondition): boolean {
        return Array.isArray((condition?.ifCondition as any)?.OR);
    }

    /**
     * Which condition branch reveals each field, by field name.
     *
     * A name revealed by more than one condition is ambiguous — there is no way to tell
     * which branch owns it — and is reported as such so callers can fall back to treating
     * it as always asked.
     * @param conditions
     */
    public static buildRevealMap(
        conditions: SchemaCondition[]
    ): Map<string, { condition: SchemaCondition, branch: 'then' | 'else' }[]> {
        const map = new Map<string, { condition: SchemaCondition, branch: 'then' | 'else' }[]>();
        const add = (name: string, condition: SchemaCondition, branch: 'then' | 'else') => {
            if (!name) {
                return;
            }
            const list = map.get(name);
            if (list) {
                list.push({ condition, branch });
            } else {
                map.set(name, [{ condition, branch }]);
            }
        };
        for (const condition of (conditions || [])) {
            for (const field of (condition.thenFields || [])) {
                add(field.name, condition, 'then');
            }
            for (const field of (condition.elseFields || [])) {
                add(field.name, condition, 'else');
            }
        }
        return map;
    }

    /**
     * True when the fields a condition's `if` reads are actually being asked.
     *
     * A field is being asked when it is declared outright, or when the condition branch
     * that reveals it is the active one — recursively, so a chain of conditions is only
     * reachable while every link above it holds. This is what separates "the field was
     * answered differently" from "the field was never asked": the first makes the `else`
     * branch active, the second makes neither branch apply.
     *
     * `evaluate` decides whether a condition's `if` holds. It is supplied by the caller so
     * the same traversal serves the form, which reads live controls, and document
     * validation, which reads submitted JSON.
     * @param condition
     * @param revealMap
     * @param evaluate
     * @param visited
     */
    public static isConditionReachable(
        condition: SchemaCondition,
        revealMap: Map<string, { condition: SchemaCondition, branch: 'then' | 'else' }[]>,
        evaluate: (condition: SchemaCondition) => boolean,
        visited: Set<SchemaCondition> = new Set()
    ): boolean {
        if (!condition || visited.has(condition)) {
            // A cycle cannot be resolved either way; treat it as asked so nothing is
            // silently dropped from the form or the document.
            return true;
        }
        visited.add(condition);
        try {
            const predicates = SchemaHelper.getConditionPredicates(condition);
            if (!predicates.length) {
                return false;
            }
            const readable = (name: string | null): boolean => {
                if (name === null) {
                    // Cross-schema path, or a predicate with no field: always readable.
                    return true;
                }
                const reveals = revealMap.get(name);
                if (!reveals?.length || reveals.length > 1) {
                    // Declared outright, or ambiguous: treated as asked.
                    return true;
                }
                const { condition: owner, branch } = reveals[0];
                if (!SchemaHelper.isConditionReachable(owner, revealMap, evaluate, visited)) {
                    return false;
                }
                return evaluate(owner) === (branch === 'then');
            };
            return SchemaHelper.isConditionDisjunctive(condition)
                ? predicates.some(readable)
                : predicates.every(readable);
        } finally {
            visited.delete(condition);
        }
    }

    /**
     * Validate the fields a schema's conditions reveal against a submitted document.
     *
     * `buildDocument` declares the shape of every branch but does not mark branch fields
     * required, because JSON Schema applies `else` whenever `if` fails — including when the
     * field the `if` reads was never asked, which would demand fields no form can show.
     * The rules that cannot be expressed there are enforced here instead:
     *
     * - a required field of the active branch must be present;
     * - no field of a condition whose `if` is unreachable may be present at all.
     *
     * Branch exclusivity for reachable conditions is still enforced by the schema itself.
     * @param conditions
     * @param data submitted document (credentialSubject)
     * @returns human readable errors, empty when the document is consistent
     */
    public static validateConditionFields(conditions: SchemaCondition[], data: any): string[] {
        const errors: string[] = [];
        if (!Array.isArray(conditions) || !conditions.length || !data || typeof data !== 'object') {
            return errors;
        }

        const resolve = (path: string[]): any => {
            let node: any = data;
            for (const segment of path) {
                if (node === null || node === undefined || typeof node !== 'object') {
                    return undefined;
                }
                node = node[segment];
            }
            return node;
        };
        const present = (value: any): boolean =>
            value !== undefined && value !== null && value !== '';
        const equals = (a: any, b: any): boolean => {
            if (a === b) {
                return true;
            }
            if (a === null || a === undefined || b === null || b === undefined) {
                return false;
            }
            const an = Number(a);
            const bn = Number(b);
            if (!Number.isNaN(an) && !Number.isNaN(bn)) {
                return an === bn;
            }
            return String(a).trim() === String(b).trim();
        };
        const test = (p: any): boolean => {
            const path = (p?.fieldPath?.length > 1) ? p.fieldPath : [p?.field?.name];
            if (!path[0]) {
                return false;
            }
            return equals(resolve(path), p.fieldValue);
        };
        const evaluate = (condition: SchemaCondition): boolean => {
            const ic: any = condition?.ifCondition;
            if (!ic) {
                return false;
            }
            if (Array.isArray(ic.AND)) {
                return ic.AND.length > 0 && ic.AND.every(test);
            }
            if (Array.isArray(ic.OR)) {
                return ic.OR.some(test);
            }
            return test(ic);
        };

        const revealMap = SchemaHelper.buildRevealMap(conditions);
        for (const condition of conditions) {
            const reachable = SchemaHelper.isConditionReachable(condition, revealMap, evaluate);
            const thenFields = condition.thenFields || [];
            const elseFields = condition.elseFields || [];

            if (!reachable) {
                for (const field of [...thenFields, ...elseFields]) {
                    if (present(data[field.name])) {
                        errors.push(
                            `Field "${field.name}" is not allowed: the condition that reveals it is not applicable.`
                        );
                    }
                }
                continue;
            }

            const active = evaluate(condition) ? thenFields : elseFields;
            for (const field of active) {
                if (field.required && !present(data[field.name])) {
                    errors.push(`Field "${field.name}" is required.`);
                }
            }
        }
        return errors;
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

        const subSchemas = document.$defs || defs;

        const buildFields = (node: any) =>
            SchemaHelper.parseFields(node, context, schemaCache, subSchemas) as SchemaField[];

        // refField.fields isn't always inlined; fall back to the parse cache, then a fresh parse.
        const refFieldsOf = (refField: any): SchemaField[] => {
            if (refField?.fields?.length) {
                return refField.fields;
            }
            const iri = refField?.type;
            if (!iri) {
                return [];
            }
            const cached = schemaCache?.get(iri);
            if (cached?.fields?.length) {
                return cached.fields;
            }
            const subDocument = subSchemas?.[iri];
            if (!subDocument) {
                return [];
            }
            return SchemaHelper.parseFields(subDocument, context, schemaCache, subSchemas) as SchemaField[];
        };

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
                    const childFields = refFieldsOf(refField);
                    if (childFields.length) {
                        preds.push(...predicatesFromProperties(
                            rule.properties,
                            childFields,
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
            thenTargets: { field: SchemaField; fieldPath: string[] }[];
            elseTargets: { field: SchemaField; fieldPath: string[] }[];
            cleanProps: any;
            hasCrossKeys: boolean;
        } => {
            const thenTargets: { field: SchemaField; fieldPath: string[] }[] = [];
            const elseTargets: { field: SchemaField; fieldPath: string[] }[] = [];
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
                    const childFields: SchemaField[] = refFieldsOf(refField);
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
            thenTargets: { field: SchemaField; fieldPath: string[] }[];
            elseTargets: { field: SchemaField; fieldPath: string[] }[];
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

        const dedupeTargets = (targets: { field: SchemaField; fieldPath: string[] }[]) =>
            [...new Map(targets.map(t => [t.fieldPath.join('.'), t])).values()];

        const parseArray = (arr: any[]): SchemaCondition[] => {
            const out: SchemaCondition[] = [];
            for (const n of arr || []) {
                if (!n?.if) {
                    continue;
                }
                const ifCondition = toIfCondition(n.if);
                const { thenTargets, elseTargets, cleanNode: cleanThen } = extractCrossTargets(n.then);
                const {
                    thenTargets: elseRequiredTargets,
                    elseTargets: elseForbiddenTargets,
                    cleanNode: cleanElse,
                } = extractCrossTargets(n.else);
                const thenFields = buildFields(cleanThen);
                const elseFields = buildFields(cleanElse);
                const allThenTargets = dedupeTargets([...thenTargets, ...elseForbiddenTargets]);
                const allElseTargets = dedupeTargets([...elseTargets, ...elseRequiredTargets]);
                const condition: any = { ifCondition, thenFields, elseFields };
                if (allThenTargets.length) { condition.thenTargets = allThenTargets; }
                if (allElseTargets.length) { condition.elseTargets = allElseTargets; }
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
            if (property === false) { continue; }
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
                type,
                SchemaHelper.buildUrl(schema.contextURL, ref),
                schema.previousVersion,
                schema.arrayDependencies
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
                    node = { properties: { [path[i]]: node }, required: [path[i]] };
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
            if (a === null || a === undefined) { return b; }
            if (b === null || b === undefined) { return a; }
            if (b === false || a === false) { return false; }
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
            if (Array.isArray(result.required) && result.properties) {
                result.required = result.required.filter(
                    (name: string) => result.properties[name] !== false
                );
                if (result.required.length === 0) { delete result.required; }
            }
            return result;
        };

        const buildCrossRequired = (targets?: { field: SchemaField; fieldPath: string[] }[]): any | undefined => {
            if (!targets?.length) { return undefined; }
            const root: any = {};
            for (const t of targets) {
                // Intentional: optional targets are still hidden via buildCrossForbidden elsewhere.
                if (!t.field.required) { continue; }
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

        const buildForbid = (sub?: SchemaField[]) => {
            if (!sub?.length) { return undefined; }
            const props: any = {};
            for (const f of sub) { props[f.name] = false; }
            return { properties: props };
        };

        const serializeCondition = (cond: SchemaCondition) => {
            const ifNode = serializeIf(cond);
            if (!ifNode) {
                return null;
            }

            // `required` is deliberately not emitted for the fields a branch reveals.
            // JSON Schema cannot tell "the field was answered differently" from "the field
            // was never asked": when a condition reads a field that another condition
            // reveals, closing the outer condition drops the read field from the document,
            // the `if` fails, and `else` applies — demanding fields the form never showed,
            // which no submission can satisfy. The flag is carried in each property's
            // `$comment` instead, where ajv does not act on it, and
            // `SchemaHelper.validateConditionFields` enforces it against the active branch.
            const buildSub = (sub?: SchemaField[]) => {
                const req: string[] = [];
                const props: any = {};
                SchemaHelper.getFieldsFromObject(sub || [], req, props, schema.contextURL);
                for (const name of req) {
                    SchemaHelper.markConditionRequired(props[name]);
                }
                return Object.keys(props).length ? { properties: props } : undefined;
            };

            const thenObj = deepMergeSchemaObj(
                deepMergeSchemaObj(
                    deepMergeSchemaObj(buildSub(cond.thenFields), buildCrossRequired(cond.thenTargets)),
                    buildCrossForbidden(cond.elseTargets)
                ),
                buildForbid(cond.elseFields?.filter(f => !cond.thenFields?.some(t => t.name === f.name)))
            );
            const elseObj = deepMergeSchemaObj(
                deepMergeSchemaObj(
                    deepMergeSchemaObj(buildSub(cond.elseFields), buildCrossRequired(cond.elseTargets)),
                    buildCrossForbidden(cond.thenTargets)
                ),
                buildForbid(cond.thenFields?.filter(f => !cond.elseFields?.some(t => t.name === f.name)))
            );

            if (!thenObj && !elseObj) {
                return null;
            }
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
            const fieldNameCount = new Map<string, number>();
            for (const f of (fields || [])) {
                fieldNameCount.set(f.name, (fieldNameCount.get(f.name) ?? 0) + 1);
            }
            document.required = document.required.filter(
                (name: string) =>
                    !conditionFieldNames.has(name) || (fieldNameCount.get(name) ?? 0) > 1
            );
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
        if (field.dependency && field.dependency.on) {
            comment.dependency = field.dependency;
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
        const { arrayDependencies } = SchemaHelper.parseSchemaComment(document.$comment);
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion, arrayDependencies
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
        const { arrayDependencies } = SchemaHelper.parseSchemaComment(document.$comment);
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion, arrayDependencies
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
        const { arrayDependencies } = SchemaHelper.parseSchemaComment(document.$comment);
        document.$comment = SchemaHelper.buildSchemaComment(
            type, SchemaHelper.buildUrl(data.contextURL, ref), previousVersion, arrayDependencies
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

        return SchemaHelper.uniqueRefs(map, {});
    }

    /**
     * Get unique refs
     * @param map
     * @param newMap
     * @private
     */
    private static uniqueRefs(map: any, newMap: any) {
        const keys = Object.keys(map);
        for (const iri of keys) {
            if (!newMap[iri]) {
                const oldSchema = map[iri];
                const newSchema = { ...oldSchema };
                delete newSchema.$defs;
                newMap[iri] = newSchema;
                if (oldSchema.$defs) {
                    SchemaHelper.uniqueRefs(oldSchema.$defs, newMap);
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
    public static buildSchemaComment(
        type: string,
        url: string,
        version?: string,
        arrayDependencies?: ISchemaArrayDependency[]
    ): string {
        if (!arrayDependencies || !arrayDependencies.length) {
            if (version) {
                return `{ "@id": "${url}", "term": "${type}", "previousVersion": "${version}" }`;
            }
            return `{ "@id": "${url}", "term": "${type}" }`;
        }
        const comment: any = { '@id': url, term: type };
        if (version) {
            comment.previousVersion = version;
        }
        comment.arrayDependencies = arrayDependencies;
        return JSON.stringify(comment);
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
