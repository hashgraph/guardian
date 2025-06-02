import { PolicyInputEventType, PolicyOutputEventType } from "../interfaces/index.js";

export interface BlockResult {
    input: any[];
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
