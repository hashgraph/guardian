import {BlockError} from '@policy-engine/interfaces';

/**
 * Error fires when block init
 */
export class BlockInitError extends Error implements BlockError {
    constructor(message: string, private blockType, private uuid) {
        super(message);
    }

    public get errorObject() {
        return {
            type: 'blockInitError',
            code: 500,
            uuid: this.uuid,
            blockType: this.blockType,
            message: this.message
        }
    }
}
