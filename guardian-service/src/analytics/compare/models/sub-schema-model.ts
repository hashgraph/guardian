import { FieldModel } from './field.model';
import { ConditionModel } from "./condition-model";
import { ICompareOptions } from '../interfaces/compare-options.interface';
import MurmurHash3 from 'imurmurhash';

export class SubSchemaModel {
    public readonly fields: FieldModel[];
    public readonly conditions: ConditionModel[];

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
            const property = document.properties[name];

            const field = new FieldModel(name, property, !!required[name], index);
            if (field.isRef) {
                const subSchemas = defs || document.$defs;
                const subDocument = subSchemas[field.type];
                const subSchema = new SubSchemaModel(subDocument, index + 1, subSchemas);
                field.setSubSchema(subSchema);
            }
            fields.push(field);
        }

        return fields;
    }

    /**
     * Parse conditions
     * @param document
     * @param context
     * @param fields
     * @param defs
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

    public update(options: ICompareOptions): void {
        let hashState = MurmurHash3();
        for (const field of this.fields) {
            field.update(options);
            hashState.hash(field.hash(options));
        }
        this._weight = String(hashState.result());
    }

    public hash(options: ICompareOptions): string {
        return this._weight;
    }
}
