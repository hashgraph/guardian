export enum BlockErrorType {
    JSON_SCHEMA_VALIDATION_ERROR = 'JSON_SCHEMA_VALIDATION_ERROR',
    DOCUMENT_VALIDATOR_BLOCK_ERROR = 'DOCUMENT_VALIDATOR_BLOCK_ERROR',
}

export interface IBlockErrorData {
    type: BlockErrorType;
}

export interface IDocumentValidatorBlockError extends IBlockErrorData {
    type: BlockErrorType.DOCUMENT_VALIDATOR_BLOCK_ERROR;
    summary: string;
    conditions: IDocumentValidatorCondition[];
}

export interface IDocumentValidatorCondition {
    label: string;
    hint?: string;
    matched: number;
    total: number;
}

export interface IJsonSchemaValidationError extends IBlockErrorData {
    type: BlockErrorType.JSON_SCHEMA_VALIDATION_ERROR;
    details: IAjvError[];
}

export interface IAjvError {
    instancePath: string;
    schemaPath: string;
    keyword: string;
    message?: string;
    params: Record<string, any>;
}
