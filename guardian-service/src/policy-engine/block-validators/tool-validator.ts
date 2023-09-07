import { DatabaseServer, PolicyTool } from '@guardian/common';
import { BlockValidator } from './block-validator';
import { ModuleValidator } from './module-validator';
import { ISerializedErrors } from './interfaces/serialized-errors.interface';

/**
 * Policy Validator
 */
export class ToolValidator {
    constructor(tool: PolicyTool) {
    }

    /**
     * Validate
     */
    public async validate(): Promise<void> {
    }

    /**
     * Get serialized errors
     */
    public getSerializedErrors(): any {
        return {};
    }
}
