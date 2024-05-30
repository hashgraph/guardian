import * as blocks from './index.js';
import { IPolicyBlock } from '../policy-engine.interface.js';

/**
 * Return block constructor by block type
 * @param blockType
 */
export function GetBlockByType(blockType: string): NewableFunction {
    const constructor = (Object.values(blocks) as any as IPolicyBlock[]).find(block => blockType === block.blockType);
    if (!constructor) {
        throw new Error(`${blockType} block is unknown`)
    }
    return constructor as any as NewableFunction;
}
