import { IValidator } from './validator.js';

export interface IValidatorNode {
    name: string;
    item: IValidator;
    selectable: boolean;
    type: string | null;
    icon?: string;
    children: IValidatorNode[];
}