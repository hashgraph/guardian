import { Token } from '@entity/token';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import MurmurHash3 from 'imurmurhash';

export class TokenModel {
    public readonly id: string;
    public readonly tokenId: string;
    public readonly tokenName: string;
    public readonly tokenSymbol: string;
    public readonly tokenType: string;
    public readonly decimals: any;
    public readonly initialSupply: any;
    public readonly enableAdmin: boolean;
    public readonly enableFreeze: boolean;
    public readonly enableKYC: boolean;
    public readonly enableWipe: boolean;

    private readonly options: ICompareOptions;
    private _weight: string;

    constructor(token: Token, options: ICompareOptions) {
        this.options = options;
        this.id = token.id;
        this.tokenId = token.tokenId;
        this.tokenName = token.tokenName;
        this.tokenSymbol = token.tokenSymbol;
        this.tokenType = token.tokenType;
        this.decimals = token.decimals;
        this.initialSupply = token.initialSupply;
        this.enableAdmin = token.enableAdmin;
        this.enableFreeze = token.enableFreeze;
        this.enableKYC = token.enableKYC;
        this.enableWipe = token.enableWipe;
        this._weight = '';
        this.update(this.options);
    }

    public equal(item: TokenModel): boolean {
        return this.tokenId === item.tokenId;
    }

    public toObject(): any {
        return {
            id: this.id,
            tokenId: this.tokenId,
            tokenName: this.tokenName,
            tokenSymbol: this.tokenSymbol,
            tokenType: this.tokenType,
            decimals: this.decimals,
            initialSupply: this.initialSupply,
            enableAdmin: this.enableAdmin,
            enableFreeze: this.enableFreeze,
            enableKYC: this.enableKYC,
            enableWipe: this.enableWipe
        }
    }

    public hash(options?: ICompareOptions): string {
        return this._weight;
    }

    public update(options: ICompareOptions): void {
        let hashState = MurmurHash3();
        hashState.hash(String(this.tokenName));
        hashState.hash(String(this.tokenSymbol));
        hashState.hash(String(this.tokenType));
        hashState.hash(String(this.decimals));
        hashState.hash(String(this.initialSupply));
        hashState.hash(String(this.enableAdmin));
        hashState.hash(String(this.enableFreeze));
        hashState.hash(String(this.enableKYC));
        hashState.hash(String(this.enableWipe));
        if (options.idLvl > 0) {
            hashState.hash(String(this.tokenId));
        }
        this._weight = String(hashState.result());
    }
}
