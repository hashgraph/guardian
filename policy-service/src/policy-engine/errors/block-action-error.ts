import { IBlockErrorData } from '@guardian/interfaces';

/**
 * Error fires in block runtime
 */
export class BlockActionError extends Error {
    private readonly blockType: string;
    private readonly uuid: string;

    public readonly data?: IBlockErrorData;

    constructor(message: string, blockType: string, uuid: string, data?: IBlockErrorData) {
        super(message);
        this.blockType = blockType;
        this.uuid = uuid;
        this.data = data;
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
            message: this.message,
            data: this.data
        }
    }
}
