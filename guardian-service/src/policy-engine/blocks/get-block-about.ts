import * as blocks from './';

export function GetBlockAbout(): any {
    const map: any = {};
    Object.values(blocks).forEach((block) => {
        map[block['blockType']] = block['about'];
    })
    return map;
}
