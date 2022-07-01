import { BlockError } from '@policy-engine/interfaces';

/**
 * Error fires when block init
 */
export class BlockInitError extends Error implements BlockError {
    constructor(message: string, private readonly blockType, private readonly uuid) {
        super(message);
    }

    /**
     * Error object getter
     */
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
