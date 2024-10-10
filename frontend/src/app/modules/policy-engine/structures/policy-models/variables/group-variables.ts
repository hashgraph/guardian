
import { PolicyGroup } from '../policy/policy-group.model';
import { ModuleVariable } from './module-variable.model';

export class GroupVariables {
    public name?: string;
    public value?: string;
    public data?: PolicyGroup;

    constructor(group?: PolicyGroup | ModuleVariable | string, value?: string) {
        if (typeof group === 'string') {
            this.name = group;
            this.value = group;
        } else if(group instanceof ModuleVariable) {
            this.name = group.name;
            this.value = group.name;
        } else if (group) {
            this.name = group.name;
            this.value = group.name;
            this.data = group;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}
