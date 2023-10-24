
import { PolicyTool } from '@guardian/common';
import { RootSearchModel } from './root.model';

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