import { IValidator } from './validator.js';
import { ISubStep } from './sub-step.js';
import { IValidateStatus } from './validate-status.js';

export interface IValidatorStep {
    name: string;
    title: string;
    prefix?: string;
    item: IValidator;
    type: string;
    config: any;
    auto: boolean;
    disabled?: boolean;
    subIndexes?: ISubStep[];
    update: () => void;
    validate: () => IValidateStatus;
}