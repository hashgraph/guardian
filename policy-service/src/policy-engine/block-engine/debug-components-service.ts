import { Policy as PolicyCollection } from '@guardian/common';
import { ComponentsService } from '../helpers/components-service.js';
import { BlockEngine } from './block-engine.js';

export class DebugComponentsService extends ComponentsService {
    private readonly controller: BlockEngine;

    constructor(
        policy: PolicyCollection,
        policyId: string,
        controller: BlockEngine
    ) {
        super(policy, policyId);
        this.controller = controller;
    }

    /**
     * Write log message
     * @param message
     * @protected
     */
    public override info(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addLog(message);
    }

    /**
     * Write error message
     * @param message
     * @protected
     */
    public override error(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addError(message);
        this.controller.stop();
    }

    /**
     * Write warn message
     * @param message
     * @protected
     */
    public override warn(message: string, attributes: string[] | null, userId?: string | null) {
        this.controller.addLog(message);
    }

    /**
     * Write debug message
     * @param message
     * @protected
     */
    public override debug(message: any) {
        if (message) {
            if (typeof message === 'string') {
                this.controller.addLog(message);
            } else {
                this.controller.addLog(JSON.stringify(message));
            }
        }
    }

    /**
     * Save and update debug context
     * @param context
     */
    public override async debugContext(tag: string, context: any): Promise<any> {
        return this.controller.getInput();
    }
}
