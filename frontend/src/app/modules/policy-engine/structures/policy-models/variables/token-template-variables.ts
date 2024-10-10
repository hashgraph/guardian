import { PolicyToken } from '../policy/policy-token.model';
import { ModuleVariable } from './module-variable.model';

export class TokenTemplateVariables {
    public name?: string;
    public value?: string;
    public data?: PolicyToken;

    constructor(token?: PolicyToken | ModuleVariable | string, value?: string) {
        if (typeof token === 'string') {
            this.name = token;
            this.value = token;
        } else if(token instanceof ModuleVariable) {
            this.name = token.name;
            this.value = token.name;
        } else if (token) {
            this.name = token.templateTokenTag;
            this.value = token.templateTokenTag;
            this.data = token;
        } else {
            this.name = '';
            this.value = '';
        }
        if (value !== undefined) {
            this.value = value;
        }
    }
}
