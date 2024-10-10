import { ITreeItemContext } from './tree-item-context.interface';

export interface ITreeContext<T, U> {
    hidden: boolean;
    collapse: number;
    open: boolean;
    number: number;
    index: number;
    lvl: number;
    offset: number;
    contexts: ITreeItemContext<T>[];
    detailContexts: ITreeItemContext<U>[];
    data: any;
}
