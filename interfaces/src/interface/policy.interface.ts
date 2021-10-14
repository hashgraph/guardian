import {PolicyType} from '../type/policy.type';

export interface IPolicy {
    id: string;
    policyId: string;
    owner: string;
    name: string;
    type: PolicyType;
    userSchema: string;
    dataSchema: string;
    topicId: string;
    rules: string;
    tokenId: string;
}
