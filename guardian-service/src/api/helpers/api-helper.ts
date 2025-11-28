/**
 * Get page options
 * @param msg
 * @param options
 */
export function getPageOptions(msg: {
    pageIndex?: number | string,
    pageSize?: number | string,
    fields?: string[],
}, options?: any): any {
    const otherOptions: any = options || {};
    const _pageSize = parseInt(String(msg.pageSize), 10);
    const _pageIndex = parseInt(String(msg.pageIndex), 10);
    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
        otherOptions.orderBy = { createDate: 'DESC' };
        otherOptions.limit = Math.min(1000, _pageSize);
        otherOptions.offset = _pageIndex * _pageSize;
    } else {
        otherOptions.orderBy = { createDate: 'DESC' };
        otherOptions.limit = 1000;
        otherOptions.offset = 0
    }

    if (msg.fields) {
        otherOptions.fields = msg.fields;
    }

    return otherOptions;
}

export function escapeRegExp(text) {
    return text.replace(/[.*+?^=!:${}()|\[\]\/\\]/g, '\\$&');
}
