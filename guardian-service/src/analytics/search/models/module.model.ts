
import { PolicyModule } from '@guardian/common';
import { RootSearchModel } from './root.model';

/**
 * Module model
 */
export class ModuleSearchModel extends RootSearchModel {
    constructor(module: PolicyModule) {
        if (!module.config) {
            throw new Error('Empty module config');
        }

        super(module);
        this.init(module.config);
    }
}