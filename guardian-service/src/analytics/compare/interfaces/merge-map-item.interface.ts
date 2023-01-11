export interface IMergeMap<T> {
    label?: string;
    left: T;
    right: T;
    rate: number;
}