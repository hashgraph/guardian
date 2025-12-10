import { FieldModel } from './field.model.js';
import { ConditionModel, ConditionPredicate } from './condition.model.js';
import { CompareOptions, ISchemaDocument } from '../interfaces/index.js';
import { ComparePolicyUtils } from '../utils/compare-policy-utils.js';
import { Hash3 } from '../hash/utils.js';
/**
 * Schema Model
 */
export class SchemaDocumentModel {
    /**
     * Fields
     * @public
     */
    public fields: FieldModel[];

    /**
     * Conditions
     * @public
     */
    public readonly conditions: ConditionModel[];

    /**
     * Weight
     * @private
     */
    private _weight: string;

    constructor(
        document: ISchemaDocument,
        defs: { [x: string]: ISchemaDocument },
        cache: Map<string, SchemaDocumentModel>
    ) {
        this._weight = '';
        this.fields = this.parseFields(document, defs, cache);
        this.conditions = this.parseConditions(document, this.fields, defs, cache);
        this.fields = this.updateConditions();
    }

    /**
     * Parse fields
     * @param document
     * @param defs
     * @param cache
     * @private
     */
    private parseFields(
        document: ISchemaDocument,
        defs: { [x: string]: ISchemaDocument },
        cache: Map<string, SchemaDocumentModel> = new Map()
    ): FieldModel[] {
        if (!document?.properties) {
            return [];
        }

        const required = new Set(document.required || []);
        const subSchemas = defs || document.$defs || {};
        const fields: FieldModel[] = [];
        const properties = Object.entries(document.properties).filter(([name]) => name !== '@context' && name !== 'type');
        for (const [name, property] of properties) {
            const field = new FieldModel(name, property, required.has(name));
            if (field.isRef) {
                let subSchema = cache.get(field.type);
                if (!subSchema) {
                    const subDocument = subSchemas[field.type];
                    subSchema = new SchemaDocumentModel(subDocument, subSchemas, cache);
                    cache.set(field.type, subSchema);
                }
                field.setSubSchema(subSchema);
            }
            fields.push(field);
        }

        return fields;
    }

    /**
     * Parse conditions
     * @param document
     * @param fields
     * @param defs
     * @param cache
     * @private
     */
    private parseConditions(
        document: ISchemaDocument,
        fields: FieldModel[],
        defs: { [x: string]: ISchemaDocument },
        cache?: Map<string, SchemaDocumentModel>
    ): ConditionModel[] {
        if (!document || !document.allOf) {
            return [];
        }

        const conditions: ConditionModel[] = [];
        const fieldsMap = new Map(fields.map(field => [field.name, field]));
        const combinedDefs = document.$defs || defs;

        for (const condition of document.allOf) {
            if (!condition?.if) {
                continue;
            }

            const thenFields = this.parseFields(condition.then, combinedDefs, cache);
            const elseFields = this.parseFields(condition.else, combinedDefs, cache);

            if (condition.if.properties && typeof condition.if.properties === 'object') {
                const ifProps = condition.if.properties;
                const ifFieldName = Object.keys(ifProps)[0];
                if (ifFieldName) {
                    const field = fieldsMap.get(ifFieldName);
                    if (!field) {
                        continue;
                    }
                    const ifFieldValue = ifProps[ifFieldName]?.const;
                    conditions.push(new ConditionModel({
                        field,
                        fieldValue: ifFieldValue,
                        thenFields,
                        elseFields
                    }));
                    continue;
                }
            }

            if (Array.isArray(condition.if.anyOf)) {
                const preds: ConditionPredicate[] = [];
                for (const anyOfItem of condition.if.anyOf) {
                    const props = anyOfItem?.properties;
                    if (!props || typeof props !== 'object') {
                        continue;
                    }
                    const name = Object.keys(props)[0];
                    if (!name) {
                        continue;
                    }
                    const field = fieldsMap.get(name);
                    if (!field) {
                        continue;
                    }
                    const value = props[name]?.const;
                    preds.push({ field, value });
                }
                if (preds.length) {
                    conditions.push(new ConditionModel({
                        operator: 'OR',
                        predicates: preds,
                        thenFields,
                        elseFields
                    }));
                }
                continue;
            }

            if (Array.isArray(condition.if.allOf)) {
                const preds: ConditionPredicate[] = [];
                for (const allOfItem of condition.if.allOf) {
                    const props = allOfItem?.properties;
                    if (!props || typeof props !== 'object') {
                        continue;
                    }
                    const name = Object.keys(props)[0];
                    if (!name) {
                        continue;
                    }
                    const field = fieldsMap.get(name);
                    if (!field) {
                        continue;
                    }
                    const value = props[name]?.const;
                    preds.push({ field, value });
                }
                if (preds.length) {
                    conditions.push(new ConditionModel({
                        operator: 'AND',
                        predicates: preds,
                        thenFields,
                        elseFields
                    }));
                }
                continue;
            }
        }
        return conditions;
    }

    /**
     * Update conditions
     * @private
     */
    private updateConditions(): FieldModel[] {
        if (this.conditions && this.conditions.length) {
            const map: any = {};
            for (let index = 0; index < this.fields.length; index++) {
                const field = this.fields[index];
                map[field.name] = index;
            }
            for (const condition of this.conditions) {
                for (const field of condition.fields) {
                    const idx = map[field.name];
                    if (idx !== undefined) {
                        this.fields[idx] = field;
                    } else {
                        this.fields.push(field);
                        map[field.name] = this.fields.length - 1;
                    }
                }
            }
        }
        return this.fields.sort((a, b) => a.order - b.order);
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        const hashState = new Hash3();
        for (const field of this.fields) {
            field.update(options);
            hashState.hash(field.hash(options));
        }
        this._weight = hashState.result();
    }

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options: CompareOptions): string {
        return this._weight;
    }

    /**
     * Get field
     * @param path
     * @public
     */
    public getField(path: string): FieldModel {
        if (!path) {
            return null;
        }
        for (const field of this.fields) {
            const result = field.getField(path);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * Compare
     * @param document
     * @public
     */
    public compare(document: SchemaDocumentModel): number {
        if (!document) {
            return 0;
        }
        const fields1 = this.fields;
        const fields2 = document.fields;

        if (!fields1 || !fields2 || !fields1.length || fields2.length) {
            return 0;
        }

        const data = ComparePolicyUtils.compareFields(this.fields, document.fields, null);
        const rates = ComparePolicyUtils.ratesToTable(data);

        if (!rates.length) {
            return 0;
        }

        let total = 0;
        for (const rate of rates) {
            total += rate.totalRate;
        }

        return Math.floor(total / rates.length);
    }

    /**
     * Create model
     * @param document
     * @public
     */
    public static from(document: ISchemaDocument): SchemaDocumentModel {
        const cache = new Map<string, SchemaDocumentModel>();
        return new SchemaDocumentModel(document, document?.$defs, cache);
    }
}