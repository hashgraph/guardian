export interface BlockErrorDTO {
    code: number;
    uuid: string;
    blockType: string;
    message: string;
    type: string;
}

export interface BlockError extends Error {
    errorObject: BlockErrorDTO;
}
