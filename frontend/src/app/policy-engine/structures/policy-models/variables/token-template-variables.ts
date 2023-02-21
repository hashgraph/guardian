import { ModuleVariableModel } from '../module-variable.model';
import { PolicyTokenModel } from '../policy-token.model';

export class TokenTemplateVariables {
    public name?: string;
    public value?: string;
    public data?: PolicyTokenModel;

    constructor(token: PolicyTokenModel | ModuleVariableModel | string) {
        if (typeof token === 'string') {
            this.name = token;
            this.value = token;
        } else if(token instanceof ModuleVariableModel) {
            this.name = token.name;
            this.value = token.name;
        } else {
            this.name = token.templateTokenTag;
            this.value = token.templateTokenTag;
            this.data = token;
        }
    }
}
