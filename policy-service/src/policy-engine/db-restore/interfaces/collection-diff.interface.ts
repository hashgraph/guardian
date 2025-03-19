import { Row, IDiffAction } from './../index.js';

export interface ICollectionDiff<T extends Row> {
    hash: string;
    actions: IDiffAction<T>[];
}
