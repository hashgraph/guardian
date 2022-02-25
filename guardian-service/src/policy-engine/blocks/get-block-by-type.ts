import * as blocks from './';

/**
 * Return block constructor by block type
 * @param blockType
 */
export function GetBlockByType(blockType: string): NewableFunction {
    const constructor = Object.values(blocks).find(block => blockType === block['blockType']);
    if (!constructor) {
        throw new Error(`${blockType} block is unknown`)
    }
    return constructor;
}
