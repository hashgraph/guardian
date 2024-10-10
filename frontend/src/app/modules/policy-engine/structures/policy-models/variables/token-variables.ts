import { Token } from '@guardian/interfaces';
import { ModuleVariable } from './module-variable.model';

export class TokenVariables {
    public name?: string;
    public value?: string;
    public data?: Token;

    constructor(token?: Token | ModuleVariable | string, value?: string) {
        if (typeof token === 'string') {
            this.name = token;
            this.value = token;
        } else if(token instanceof ModuleVariable) {
            this.name = token.name;
            this.value = token.name;
        } else if (token) {
            this.name = token.tokenName;
            this.value = token.tokenId;
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
