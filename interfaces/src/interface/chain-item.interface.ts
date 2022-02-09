export interface IChainItem {
    type: 'VP' | 'VC' | 'DID';
    id: string;
    document: any;
    owner: string;
    schema: string;
    label: string;
    tag: string;
    entity: string;
}
