import { ObjectId } from 'mongodb';
import { ICollectionDiff, VC } from './../index.js';

export interface IPolicyDiff {
    type?: 'backup' | 'diff';
    lastUpdate?: Date;
    vcCollection?: ICollectionDiff<VC>;
}