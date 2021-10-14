export interface IChainItem {
    type: 'VP' | 'VC' | 'DID';
    id: string;
    document: any;
    schema: string;
    label: string;
    tag: string;
}
