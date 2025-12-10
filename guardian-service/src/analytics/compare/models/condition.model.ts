import { FieldModel } from './field.model.js';

export type LogicOp = 'AND' | 'OR';

export interface ConditionPredicate {
    field: FieldModel;
    value: any;
}

/**
 * Condition Model
 */
export class ConditionModel {
    /**
     * Field name
     * @public
     */
    public readonly name: string | null;

    /**
     * Field Model
     * @public
     */
    public readonly field: FieldModel | null;

    /**
     * Field value
     * @public
     */
    public readonly fieldValue: any;

    /**
     * Operator
     * @public
     */
    public readonly operator?: LogicOp;

    /**
     * Predicates
     * @public
     */
    public readonly predicates?: ConditionPredicate[];

    /**
     * Then Fields
     * @public
     */
    public readonly thenFields: FieldModel[];

    /**
     * Else Fields
     * @public
     */
    public readonly elseFields: FieldModel[];

    /**
     * All Fields
     * @public
     */
    public readonly fields: FieldModel[];

    constructor(args: {
        field?: FieldModel | null;
        fieldValue?: any;
        thenFields: FieldModel[];
        elseFields: FieldModel[];
        operator?: LogicOp;
        predicates?: ConditionPredicate[];
    }) {
        const {
            field = null,
            fieldValue = null,
            thenFields = [],
            elseFields = [],
            operator,
            predicates,
        } = args;

        this.field = field;
        this.fieldValue = fieldValue;
        this.thenFields = thenFields;
        this.elseFields = elseFields;
        this.operator = operator;
        this.predicates = predicates;

        this.name = field ? field.name : null;
        this.fields = [];

        const thenCondition = this.buildConditionString(true);
        const elseCondition = this.buildConditionString(false);

        if (thenFields) {
            for (const item of thenFields) {
                item.setCondition(thenCondition);
                this.fields.push(item);
            }
        }
        if (elseFields) {
            for (const item of elseFields) {
                item.setCondition(elseCondition);
                this.fields.push(item);
            }
        }
    }

    private buildConditionString(isThen: boolean): string {
        if (this.field && this.name !== null) {
            const eq = `${this.name} = '${this.fieldValue}'`;
            if (isThen) {
                return eq;
            } else {
                return `${this.wrapNot(eq)}`;
            }
        }

        const parts =
            (this.predicates || []).map(p => `(${p.field.name} = '${p.value}')`);

        const op = this.operator || 'AND';
        const joined = parts.join(` ${op} `) || '';

        if (!joined) {
            return '';
        }

        if (isThen) {
            return joined;
        }
        return this.wrapNot(joined);
    }

    private wrapNot(expr: string): string {
        if (!expr) {
            return '';
        } else {
            return `NOT(${expr})`;
        }
    }
}
