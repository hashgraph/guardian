import {IToken, ITokenInfo} from '../interface/token.interface';

export class Token {
    public tokenId: string;
    public tokenName: string;
    public tokenSymbol: string;
    public associated: string;
    public hBarBalance: string;
    public tokenBalance: string;
    public frozen: string;
    public kyc: string;
    public url: string;
    public tokenUrl: string;

    constructor(data: IToken);
    constructor(data: ITokenInfo);
    constructor(...args: any) {
        const data = args[0];
        this.tokenId = data.tokenId;
        this.tokenName = data.tokenName;
        this.tokenSymbol = data.tokenSymbol;
        this.associated = data.associated ? 'Yes' : 'No';
        this.tokenBalance = data.balance || 'n/a';
        this.hBarBalance = data.hBarBalance || 'n/a';
        if (data.associated) {
            this.frozen = data.frozen ? 'Yes' : 'No';
            this.kyc = data.kyc ? 'Yes' : 'No';
        } else {
            this.frozen = 'n/a';
            this.kyc = 'n/a';
        }

        this.tokenUrl = 'https://testnet.dragonglass.me/hedera/tokens/' + this.tokenId.split('-')[0];
        this.url = btoa(this.tokenId);
    }
}
