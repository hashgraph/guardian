import { IValidator } from './validator';

export interface IValidatorNode {
    name: string;
    item: IValidator;
    selectable: boolean;
    type: string | null;
    icon?: string;
    children: IValidatorNode[];
}