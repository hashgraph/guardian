import { FieldModel } from './field.model';

/**
 * Condition Model
 */
export class ConditionModel {
    public readonly index: number;
    public readonly name: string;
    public readonly field: FieldModel;
    public readonly fieldValue: any;
    public readonly thenFields: FieldModel[];
    public readonly elseFields: FieldModel[];
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
