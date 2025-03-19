import { Row, DiffActionType } from './../index.js';

export interface IDiffAction<T extends Row> {
    type: DiffActionType;
    id: string;
    data: T;
}
