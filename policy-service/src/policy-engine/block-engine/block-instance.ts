import { BlockResult } from './block-result.js';

export abstract class BlockInstance {
    public readonly policyId: string;

    constructor(policyId: string) {
        this.policyId = policyId;
    }

    public abstract build(config: any): Promise<BlockInstance>;
    public abstract run(input: any): Promise<BlockResult>;
}