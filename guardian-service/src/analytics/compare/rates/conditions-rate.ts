import { Status } from "../types/status.type";
import { ConditionModel } from "../models/field.model";
import { Rate } from "./rate";


export class ConditionsRate extends Rate<ConditionModel> {
    constructor(condition1: ConditionModel, condition2: ConditionModel) {
        super(condition1, condition2);
        if (condition1 && condition2) {
            this.totalRate = 100;
            this.type = Status.FULL;
        } else {
            if (condition1) {
                this.type = Status.LEFT;
            } else {
                this.type = Status.RIGHT;
            }
            this.totalRate = -1;
        }
    }
}
