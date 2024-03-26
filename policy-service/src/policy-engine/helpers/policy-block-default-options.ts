import { PolicyBlockOptionsPartial } from '../interfaces/block-options.js';

/**
 * Default options for block instance
 */
export function PolicyBlockDefaultOptions(): PolicyBlockOptionsPartial {
    return Object.assign({}, {
        commonBlock: false,
        tag: null,
        defaultActive: false,
        permissions: [],
        _parent: null
    })
}
