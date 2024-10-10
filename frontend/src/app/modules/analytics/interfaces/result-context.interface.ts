export interface IResultContext<T> {
    index: number;
    left: boolean;
    right: boolean;
    fantom?: boolean;
    data: T;
}
