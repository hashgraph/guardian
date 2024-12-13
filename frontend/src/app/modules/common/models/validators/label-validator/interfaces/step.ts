import { IValidator } from './validator';
import { ISubStep } from './sub-step';

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
}
