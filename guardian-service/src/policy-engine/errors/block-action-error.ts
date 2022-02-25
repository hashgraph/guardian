/**
 * Error fires in block runtime
 */
export class BlockActionError extends Error {
    constructor(message: string, private blockType, private uuid) {
        super(message);
    }

    public get errorObject() {
        console.error(this.message);
        return {
            type: 'blockActionError',
            code: 500,
            uuid: this.uuid,
            blockType: this.blockType,
            message: this.message
        }
    }
}
