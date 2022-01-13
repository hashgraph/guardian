export interface IChainItem {
    type: 'VP' | 'VC' | 'DID';
    cid?:string;
    id: string;
    document: any;
    owner: string;
    schema: string;
    label: string;
    tag: string;
}
