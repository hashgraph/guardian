import { RestoreEntity } from '@guardian/common';
import { DiffActionType } from './../index.js';

export interface IDiffAction<T extends RestoreEntity> {
    type: DiffActionType;
    id: string;
    data: T;
}
