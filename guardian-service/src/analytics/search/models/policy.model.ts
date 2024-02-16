import { Policy } from '@guardian/common';
import { RootSearchModel } from './root.model';

/**
 * Policy model
 */
export class PolicySearchModel extends RootSearchModel {
    /**
     * Policy version
     * @public
     */
    public readonly version: string;

    constructor(policy: Policy) {
        if (!policy.config) {
            throw new Error('Empty policy config');
        }

        super(policy);
        this.version = policy.version;
        this.init(policy.config);
    }
}