import { FieldModel } from './field.model';

/**
 * Condition Model
 */
export class ConditionModel {
    /**
     * Condition index
     * @public
     */
    public readonly index: number;

    /**
     * Field name
     * @public
     */
    public readonly name: string;

    /**
     * Field Model
     * @public
     */
    public readonly field: FieldModel;

    /**
     * Field value
     * @public
     */
    public readonly fieldValue: any;

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

    constructor(
        field: FieldModel,
        fieldValue: any,
        thenFields: FieldModel[],
        elseFields: FieldModel[],
        index: number
    ) {
        this.index = index;
        this.field = field;
        this.fieldValue = fieldValue;
        this.thenFields = thenFields;
        this.elseFields = elseFields;
        this.name = field ? field.name : null;
        this.fields = [];
        if (this.name) {
            const thenCondition = `${this.name} = '${fieldValue}'`;
            const elseCondition = `${this.name} != '${fieldValue}'`;
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
    }
}
