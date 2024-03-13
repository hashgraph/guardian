import { FieldModel } from './field.model.js';
import { ConditionModel } from './condition.model.js';
import { CompareOptions } from '../interfaces/compare-options.interface.js';
import MurmurHash3 from 'imurmurhash';
import { ComparePolicyUtils } from '../utils/compare-policy-utils.js';

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

    constructor(document: any, index: number, defs?: any) {
        this._weight = '';
        this.fields = this.parseFields(document, index + 1, defs);
        this.conditions = this.parseConditions(document, index + 1, this.fields, defs);
        this.fields = this.updateConditions();
    }

    /**
     * Parse fields
     * @param document
     * @param contextURL
     * @param defs
     * @private
     */
    private parseFields(document: any, index: number, defs?: any): FieldModel[] {
        const fields: FieldModel[] = [];

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
            if (name === '@context' || name === 'type') {
                continue;
            }

            const property = document.properties[name];

            const field = new FieldModel(name, property, !!required[name], index);
            if (field.isRef) {
                const subSchemas = defs || document.$defs;
                const subDocument = subSchemas[field.type];
                const subSchema = new SchemaDocumentModel(subDocument, index + 1, subSchemas);
                field.setSubSchema(subSchema);
            }
            fields.push(field);
        }

        return fields;
    }

    /**
     * Parse conditions
     * @param document
     * @param index
     * @param fields
     * @param defs
     * @private
     */
    private parseConditions(
        document: any,
        index: number,
        fields: FieldModel[],
        defs: any = null
    ): ConditionModel[] {
        const conditions: ConditionModel[] = [];
        if (!document || !document.allOf) {
            return conditions;
        }
        const allOf = Object.keys(document.allOf);
        for (const oneOf of allOf) {
            const condition = document.allOf[oneOf];
            if (!condition.if) {
                continue;
            }
            const ifConditionFieldName = Object.keys(condition.if.properties)[0];
            conditions.push(new ConditionModel(
                fields.find(field => field.name === ifConditionFieldName),
                condition.if.properties[ifConditionFieldName].const,
                this.parseFields(condition.then, index, document.$defs || defs),
                this.parseFields(condition.else, index, document.$defs || defs),
                index
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
}
