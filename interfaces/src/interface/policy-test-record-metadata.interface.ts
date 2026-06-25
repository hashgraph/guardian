export interface IRecordPolicyTestMetadata {
    outputs?: string[];
    outputActions?: Record<string, string> | null;
    name?: string;
    description?: string;
}
