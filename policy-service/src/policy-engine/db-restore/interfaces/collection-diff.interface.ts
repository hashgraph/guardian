import { RestoreEntity } from '@guardian/common';
import { IDiffAction } from './../index.js';

export interface ICollectionDiff<T extends RestoreEntity> {
    hash: string;
    actions: IDiffAction<T>[];
}
