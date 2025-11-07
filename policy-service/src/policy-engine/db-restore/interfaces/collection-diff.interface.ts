import { RestoreEntity } from '@guardian/common';
import { IDiffAction, IKeyAction } from './../index.js';

export interface ICollectionDiff<T extends RestoreEntity> {
    hash: string;
    fullHash: string;
    actions: IDiffAction<T>[];
}

export interface ICollectionKeys {
    hash: string;
    fullHash: string;
    actions: IKeyAction[];
}