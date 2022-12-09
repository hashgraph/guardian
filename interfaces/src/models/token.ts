import { IToken, ITokenInfo } from '..';

/**
 * Token class
 */
export class Token {
    /**
     * Token ID
     */
    public tokenId: string;
    /**
     * Token name
     */
    public tokenName: string;
    /**
     * Token symbol
     */
    public tokenSymbol: string;
    /**
     * Enable Admin
     */
    public enableAdmin: boolean;
    /**
     * Enable Freeze
     */
    public enableFreeze: boolean;
    /**
     * Enable KYC
     */
    public enableKYC: boolean;
    /**
     * Enable Wipe
     */
    public enableWipe: boolean;
    /**
     * Was associated
     */
    public associated: string;
    /**
     * HBar balance
     */
    public hBarBalance: string;
    /**
     * Token balance
     */
    public tokenBalance: string;
    /**
     * Was frozen
     */
    public frozen: string;
    /**
     * KYC
     */
    public kyc: string;
    /**
     * URL
     */
    public url: string;
    /**
     * policies
     */
    public policies: string[];
    /**
     * Token type
     */
    public tokenType?: string;
    /**
     * Token decimals
     */
    public decimals: any;
    /**
     * Initial supply
     */
    public initialSupply?: any;
    /**
     * Token constructor
     * @param data
     * @constructor
     */
    constructor(data: ITokenInfo | IToken) {
        this.tokenId = data.tokenId;
        this.tokenName = data.tokenName;
        this.tokenSymbol = data.tokenSymbol;
        this.tokenType = data.tokenType;
        this.decimals = data.decimals;
        this.initialSupply = data.initialSupply;
        this.enableAdmin = data.enableAdmin;
        this.enableFreeze = data.enableFreeze;
        this.enableKYC = data.enableKYC;
        this.enableWipe = data.enableWipe;
        this.policies = (data as any).policies || [];
        this.associated = (data as ITokenInfo).associated ? 'Yes' : 'No';
        this.tokenBalance = (data as ITokenInfo).balance || 'n/a';
        this.hBarBalance = (data as ITokenInfo).hBarBalance || 'n/a';
        if ((data as ITokenInfo).associated) {
            this.frozen = (data as ITokenInfo).frozen ? 'Yes' : 'No';
            this.kyc = (data as ITokenInfo).kyc ? 'Yes' : 'No';
        } else {
            this.frozen = 'n/a';
            this.kyc = 'n/a';
        }
        this.url = btoa(this.tokenId);
    }
}
