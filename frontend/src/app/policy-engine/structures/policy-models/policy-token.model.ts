import { GenerateUUIDv4, TokenType } from '@guardian/interfaces';
import { PolicyModel } from './policy.model';


export class PolicyTokenModel {
    private readonly policy: PolicyModel;

    public readonly id: string;

    private _templateTokenTag: string;
    private _tokenName: string;
    private _tokenSymbol: string;
    private _tokenType?: TokenType;
    private _decimals: string;
    private _enableAdmin?: boolean | undefined;
    private _changeSupply?: boolean | undefined;
    private _enableFreeze?: boolean | undefined;
    private _enableKYC?: boolean | undefined;
    private _enableWipe?: boolean | undefined;

    private _changed: boolean;

    constructor(token: any, policy: PolicyModel) {
        this._changed = false;

        this.policy = policy;
        this.id = token.id || GenerateUUIDv4();

        this._templateTokenTag = token.templateTokenTag;
        this._tokenName = token.tokenName;
        this._tokenSymbol = token.tokenSymbol;
        this._tokenType = token.tokenType;
        this._decimals = token.decimals;
        this._enableAdmin = token.enableAdmin;
        this._changeSupply = token.changeSupply;
        this._enableFreeze = token.enableFreeze;
        this._enableKYC = token.enableKYC;
        this._enableWipe = token.enableWipe;
    }

    public get templateTokenTag(): string {
        return this._templateTokenTag;
    }
    public set templateTokenTag(value: string) {
        this._templateTokenTag = value;
        this.changed = true;
    }

    public get tokenName(): string {
        return this._tokenName;
    }

    public set tokenName(value: string) {
        this._tokenName = value;
        this.changed = true;
    }

    public get tokenSymbol(): string {
        return this._tokenSymbol;
    }

    public set tokenSymbol(value: string) {
        this._tokenSymbol = value;
        this.changed = true;
    }

    public get tokenType(): TokenType | undefined {
        return this._tokenType;
    }

    public set tokenType(value: TokenType | undefined) {
        this._tokenType = value;
        this.changed = true;
    }

    public get decimals(): string {
        return this._decimals;
    }

    public set decimals(value: string) {
        this._decimals = value;
        this.changed = true;
    }

    public get enableAdmin(): boolean | undefined {
        return this._enableAdmin;
    }

    public set enableAdmin(value: boolean | undefined) {
        this._enableAdmin = value;
        this.changed = true;
    }

    public get changeSupply(): boolean | undefined {
        return this._changeSupply;
    }

    public set changeSupply(value: boolean | undefined) {
        this._changeSupply = value;
        this.changed = true;
    }

    public get enableFreeze(): boolean | undefined {
        return this._enableFreeze;
    }

    public set enableFreeze(value: boolean | undefined) {
        this._enableFreeze = value;
        this.changed = true;
    }

    public get enableKYC(): boolean | undefined {
        return this._enableKYC;
    }

    public set enableKYC(value: boolean | undefined) {
        this._enableKYC = value;
        this.changed = true;
    }

    public get enableWipe(): boolean | undefined {
        return this._enableWipe;
    }

    public set enableWipe(value: boolean | undefined) {
        this._enableWipe = value;
        this.changed = true;
    }

    public get changed(): boolean {
        return this._changed;
    }

    public set changed(value: boolean) {
        this._changed = value;
        if (this.policy) {
            this.policy.changed = true;
        }
    }

    public emitUpdate() {
        this._changed = false;
        this.policy.emitUpdate();
    }

    public getJSON(): any {
        return {
            templateTokenTag: this.templateTokenTag,
            tokenName: this.tokenName,
            tokenSymbol: this.tokenSymbol,
            tokenType: this.tokenType,
            decimals: this.decimals,
            enableAdmin: this.enableAdmin,
            changeSupply: this.changeSupply,
            enableFreeze: this.enableFreeze,
            enableKYC: this.enableKYC,
            enableWipe: this.enableWipe
        };
    }

    public checkChange() {
        if (this._changed) {
            this.emitUpdate();
        }
    }
}
