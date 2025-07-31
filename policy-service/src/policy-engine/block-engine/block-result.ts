import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';

export interface IDebugContext {
    documents: any[] | any,
    sources?: any
}

export interface BlockResult {
    input: IDebugContext;
    output: any[];
    logs: string[];
    errors: string[];
}

export interface BlockData {
    type: string;
    input: PolicyInputEventType;
    output: PolicyOutputEventType;
    document: any;
}
