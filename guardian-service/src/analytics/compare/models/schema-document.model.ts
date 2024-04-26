import { FieldModel } from './field.model.js';
import { ConditionModel } from './condition.model.js';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import MurmurHash3 from 'imurmurhash';
import { ComparePolicyUtils } from '../utils/compare-policy-utils.js';
import { ISchemaDocument } from '@guardian/interfaces';

/**
 * Schema Model
 */
export class SchemaDocumentModel {
    /**
     * Fields
     * @public
     */
    public readonly fields: FieldModel[];

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
            if (!condition.if) {
                continue;
            }
            const ifConditionFieldName = Object.keys(condition.if.properties)[0];
            const field = fieldsMap.get(ifConditionFieldName);
            if (!field) {
                continue;
            }
            const ifFieldValue = condition.if.properties[ifConditionFieldName].const;
            const thenFields = this.parseFields(condition.then, combinedDefs, cache);
            const elseFields = this.parseFields(condition.else, combinedDefs, cache);
            conditions.push(new ConditionModel(
                field,
                ifFieldValue,
                thenFields,
                elseFields
            ));
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
                    if (map[field.name]) {
                        this.fields[map[field.name]] = field;
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
        const hashState = MurmurHash3();
        for (const field of this.fields) {
            field.update(options);
            hashState.hash(field.hash(options));
        }
        this._weight = String(hashState.result());
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