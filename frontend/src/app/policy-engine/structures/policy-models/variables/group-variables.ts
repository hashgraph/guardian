import { ModuleVariableModel } from '../module-variable.model';
import { PolicyGroupModel } from '../policy-group.model';

export class GroupVariables {
    public name?: string;
    public value?: string;
    public data?: PolicyGroupModel;

    constructor(group: PolicyGroupModel | ModuleVariableModel | string) {
        if (typeof group === 'string') {
            this.name = group;
            this.value = group;
        } else if(group instanceof ModuleVariableModel) {
            this.name = group.name;
            this.value = group.name;
        } else {
            this.name = group.name;
            this.value = group.name;
            this.data = group;
        }
    }
}
