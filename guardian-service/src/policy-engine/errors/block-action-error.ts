/**
 * Error fires in block runtime
 */
export class BlockActionError extends Error {
    constructor(message: string, private readonly blockType, private readonly uuid) {
        super(message);
    }

    /**
     * Error object getter
     */
    public get errorObject() {
        return {
            type: 'blockActionError',
            code: 500,
            uuid: this.uuid,
            blockType: this.blockType,
            message: this.message
        }
    }
}
