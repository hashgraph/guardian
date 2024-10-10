import { IToken, ITokenInfo } from '../index.js';

/**
 * Token class
 */
export class Token {
    /**
     * ID
     */
    public id: string;
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
     * Is token draft
     */
    public draftToken: boolean;

    /**
     * Can delete
     */
    public canDelete: boolean;

    /**
     * Wipe contract identifier
     */
    public wipeContractId: string;

    /**
     * Token constructor
     * @param data
     * @constructor
     */
    constructor(data: ITokenInfo | IToken) {
        this.id = data.id;
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
        this.draftToken = data.draftToken;
        this.canDelete = data.canDelete;
        if ((data as ITokenInfo).associated) {
            this.frozen = (data as ITokenInfo).frozen ? 'Yes' : 'No';
            this.kyc = (data as ITokenInfo).kyc ? 'Yes' : 'No';
        } else {
            this.frozen = 'n/a';
            this.kyc = 'n/a';
        }
        this.url = btoa(this.tokenId);
        this.wipeContractId = data.wipeContractId;
    }
}
