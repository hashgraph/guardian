import { PolicyBlockDecoratorOptions } from '../interfaces/block-options.js';

/**
 * Return custom options object for block instance
 * @param options
 */
export function GetOtherOptions<T extends PolicyBlockDecoratorOptions>(options: T): Partial<T> {
    const {
        blockType,
        commonBlock,
        tag,
        defaultActive,
        permissions,
        blockMap,
        tagMap,
        _uuid,
        _parent,
        baseClass,
        ...rest
    } = options as any;
    return JSON.parse(JSON.stringify(rest));
}
