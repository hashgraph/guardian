import { CompareOptions, IIdLvl, IWeightItem, ITokenRawData } from '../interfaces/index.js';
import { Hash3 } from '../hash/utils.js';

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
    private readonly options: CompareOptions;

    constructor(token: ITokenRawData, options: CompareOptions) {
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
     * Comparison of models using key
     * @param item - model
     * @public
     */
    public equalKey(item: TokenModel): boolean {
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
    public hash(options?: CompareOptions): string {
        return this._weight;
    }

    /**
     * Update all weight
     * @param options - comparison options
     * @public
     */
    public update(options: CompareOptions): void {
        const hashState = new Hash3();
        hashState.hash(String(this.tokenName));
        hashState.hash(String(this.tokenSymbol));
        hashState.hash(String(this.tokenType));
        hashState.hash(String(this.decimals));
        hashState.hash(String(this.initialSupply));
        hashState.hash(String(this.enableAdmin));
        hashState.hash(String(this.enableFreeze));
        hashState.hash(String(this.enableKYC));
        hashState.hash(String(this.enableWipe));
        if (options.idLvl === IIdLvl.All) {
            hashState.hash(String(this.tokenId));
        }
        this._weight = String(hashState.result());
    }

    /**
     * Get weight object
     * @public
     */
    public toWeight(options: CompareOptions): IWeightItem {
        if (!this._weight) {
            return {
                weight: this.tokenId
            }
        } else {
            return {
                weight: this._weight
            }
        }
    }

    /**
     * Create model
     * @param raw
     * @param options
     * @public
     * @static
     */
    public static fromEntity(
        raw: ITokenRawData,
        options: CompareOptions
    ): TokenModel {
        if (!raw) {
            throw new Error('Unknown token');
        }
        const tokenModel = new TokenModel(raw, options);
        tokenModel.update(options);
        return tokenModel;
    }
}
