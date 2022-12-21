export interface IProperties<T> {
    name: string;
    lvl: number;
    path: string;
    type: 'array' | 'object' | 'property';
    value?: T;
}
