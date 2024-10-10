export interface IBlock<U> {
    id: string;
    tag: string;
    blockType: string;
    defaultActive: boolean;
    permissions: string[];
    stateMutation: Object;
    onlyOwnDocuments: boolean;
    uiMetaData: U;
    children: IBlock<any>[];
}
