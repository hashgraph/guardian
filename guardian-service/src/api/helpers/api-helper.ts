/**
 * Get page options
 * @param msg
 * @param options
 */
export function getPageOptions(msg: any, options?: any): any {
    const otherOptions: any = options || {};
    const _pageSize = parseInt(msg.pageSize, 10);
    const _pageIndex = parseInt(msg.pageIndex, 10);
    if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
        otherOptions.orderBy = { createDate: 'DESC' };
        otherOptions.limit = _pageSize;
        otherOptions.offset = _pageIndex * _pageSize;
    }
    return otherOptions;
}