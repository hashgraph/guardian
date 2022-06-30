import * as blocks from './';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';

/**
 * Get block about information
 * @constructor
 */
export function GetBlockAbout(): any {
    const map: unknown = {};
    const blockValues = Object.values(blocks) as any as IPolicyBlock[];
    for (const block of blockValues) {
        map[block.blockType] = block.about;
    }
    return map;
}
