// interface IPolicy {
//     id: string;
//     name: string;
//     root: IBlock<any, any>
// }
export interface IBlock<U> {
    id: string;
    tag: string;
    blockType: string;
    defaultActive: boolean;
    permissions: string[];
    dependencies: string[];
    stateMutation: Object;
    onlyOwnDocuments: boolean;
    uiMetaData: U;
    children: IBlock<any>[];
}
