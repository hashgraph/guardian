import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';

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
        dependencies,
        blockMap,
        tagMap,
        _uuid,
        _parent,
        baseClass,
        ...rest
    } = options as any;
    return JSON.parse(JSON.stringify(rest));
}
