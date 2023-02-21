import { Token } from '@guardian/interfaces';
import { ModuleVariableModel } from '../module-variable.model';

export class TokenVariables {
    public name?: string;
    public value?: string;
    public data?: Token;

    constructor(token: Token | ModuleVariableModel | string) {
        if (typeof token === 'string') {
            this.name = token;
            this.value = token;
        } else if(token instanceof ModuleVariableModel) {
            this.name = token.name;
            this.value = token.name;
        } else {
            this.name = token.tokenName;
            this.value = token.tokenId;
            this.data = token;
        }
    }
}
