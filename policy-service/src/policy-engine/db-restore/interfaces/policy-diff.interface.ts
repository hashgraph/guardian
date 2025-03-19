import { ObjectId } from 'mongodb';
import { ICollectionDiff, VC } from './../index.js';

export interface IPolicyDiff {
    _id?: ObjectId;
    id?: string;
    uuid?: string;
    policyId?: string;
    messageId?: string;
    policyTopicId?: string;
    instanceTopicId?: string;
    diffTopicId?: string;
    lastUpdate?: Date;
    vcCollectionId?: ObjectId;
    vcCollection?: ICollectionDiff<VC>;
}
