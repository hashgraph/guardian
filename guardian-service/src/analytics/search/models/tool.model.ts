
import { PolicyTool } from '@guardian/common/entity/tool';
import { RootSearchModel } from './root.model.js';

/**
 * Tool model
 */
export class ToolSearchModel extends RootSearchModel {
    constructor(tool: PolicyTool) {
        if (!tool.config) {
            throw new Error('Empty tool config');
        }

        super(tool);
        this.init(tool.config);
    }
}
