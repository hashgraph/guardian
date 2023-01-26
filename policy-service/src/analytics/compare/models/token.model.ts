import { Token } from '@entity/token';
import { ICompareOptions } from '../interfaces/compare-options.interface';
import MurmurHash3 from 'imurmurhash';

/**
 * Token Model
 */
export class TokenModel {
    /**
     * ID
     * @public
     */
    public readonly id: string;

    /**
     * Token ID
     * @public
     */
    public readonly tokenId: string;

    /**
     * Token Name
     * @public
     */
    public readonly tokenName: string;

    /**
     * Token Symbol
     * @public
     */
    public readonly tokenSymbol: string;

    /**
     * Token Type
     * @public
     */
    public readonly tokenType: string;

    /**
     * Token Decimals
     * @public
     */
    public readonly decimals: any;

    /**
     * Token Initial Supply
     * @public
     */
    public readonly initialSupply: any;

    /**
     * Enable Admin
     * @public
     */
    public readonly enableAdmin: boolean;

    /**
     * Enable Freeze
     * @public
     */
    public readonly enableFreeze: boolean;

    /**
     * Enable KYC
     * @public
     */
    public readonly enableKYC: boolean;

    /**
     * Enable Wipe
     * @public
     */
    public readonly enableWipe: boolean;

    /**
     * Weights
     * @private
     */
    private _weight: string;

    /**
     * Compare Options
     * @private
     */
    private readonly options: ICompareOptions;

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

    /**
     * Comparison of models using id
     * @param item - model
     * @public
     */
    public equal(item: TokenModel): boolean {
        return this.tokenId === item.tokenId;
    }

    /**
     * Convert class to object
     * @public
     */
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

    /**
     * Calculations hash
     * @param options - comparison options
     * @public
     */
    public hash(options?: ICompareOptions): string {
        return this._weight;
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: ICompareOptions): void {
        const hashState = MurmurHash3();
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
