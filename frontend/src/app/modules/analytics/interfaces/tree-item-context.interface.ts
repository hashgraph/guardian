
export interface ITreeItemContext<T> {
    key: string;
    type: string;
    rate: number;
    index: number;
    left: boolean;
    right: boolean;
    fantom: boolean;
    data: T;
}
