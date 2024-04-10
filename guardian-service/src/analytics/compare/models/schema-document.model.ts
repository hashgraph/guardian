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
        if (!document?.properties) {
            return [];
        }

        const fields: FieldModel[] = [];
        const required = new Set(document.required || []);
        const properties = Object.keys(document.properties).filter(name => name !== '@context' && name !== 'type');
        const subSchemas = new Map();

        for (const name of properties) {
            const property = document.properties[name];

            const field = new FieldModel(name, property, required.has(name), index);
            if (field.isRef) {
                let subDocument = subSchemas.get(field.type);
                if (!subDocument) {
                    subDocument = (defs || document.$defs)[field.type];
                    subSchemas.set(field.type, subDocument);
                }
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
        if (!document || !document.allOf) {
            return [];
        }

        const conditions: ConditionModel[] = [];
        const allOfKeys = Object.keys(document.allOf);

        for (const oneOf of allOfKeys) {
            const condition = document.allOf[oneOf];
            if (!condition.if) {
                continue;
            }
            const ifConditionFieldName = Object.keys(condition.if.properties)[0];
            const ifFieldValue = condition.if.properties[ifConditionFieldName].const;
            const thenFields = this.parseFields(condition.then, index, document.$defs || defs);
            const elseFields = this.parseFields(condition.else, index, document.$defs || defs);
            conditions.push(new ConditionModel(
                fields.find(field => field.name === ifConditionFieldName),
                ifFieldValue,
                thenFields,
                elseFields,
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
