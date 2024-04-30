
import { BlockState } from '@guardian/common';
import { PolicyDataLoader } from './loader.js';

/**
 * Block state loader
 */
export class BlockStateLoader extends PolicyDataLoader<BlockState> {
    async get() {
        const blockStates = await this.db.getBlockStates(this.policyId);
        blockStates.sort((a: any, b: any) => {
            return b.updateDate - a.updateDate
        })
        const result = new Map();
        for (const state of blockStates) {
            const existingState = result.get(state.blockId);
            if (!existingState) {
                result.set(state.blockId, state)
            }
        }
        return [...result.values()];
    }
}
