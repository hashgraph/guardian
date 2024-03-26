import * as blocks from './index.js';
import { IPolicyBlock } from '../policy-engine.interface.js';

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
