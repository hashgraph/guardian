import { PolicyRole } from '../policy/policy-role.model';
import { ModuleVariable } from './module-variable.model';

export class RoleVariables {
    public name?: string;
    public value?: string;
    public data?: PolicyRole;

    constructor(role?: PolicyRole | ModuleVariable | string, value?: string) {
        if (typeof role === 'string') {
            this.name = role;
            this.value = role;
        } else if (role instanceof ModuleVariable) {
            this.name = role.name;
            this.value = role.name;
        } else if (role) {
            this.name = role.name;
            this.value = role.name;
            this.data = role;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}
