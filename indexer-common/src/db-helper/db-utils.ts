
export class DataBaseUtils {
    public static pageParams(
        pageSize: string | number | undefined,
        pageIndex: string | number | undefined,
        limit: number = 100,
        orderField: string,
        orderDir: string
    ): {
        orderBy: { [x: string]: string },
        limit: number,
        offset: number
    } {
        const otherOptions: any = { limit, offset: 0 };
        if (orderField && orderDir) {
            otherOptions.orderBy = {};
            otherOptions.orderBy[orderField] = orderDir;
        }
        let _pageSize: number, _pageIndex: number;
        if (typeof pageSize === 'number') {
            _pageSize = pageSize;
        } else if (typeof pageSize === 'string') {
            _pageSize = parseInt(pageSize, 10);
        } else {
            return otherOptions;
        }
        if (typeof pageIndex === 'number') {
            _pageIndex = pageIndex;
        } else if (typeof pageIndex === 'string') {
            _pageIndex = parseInt(pageIndex, 10);
        } else {
            return otherOptions;
        }
        if (Number.isFinite(_pageSize) && _pageSize) {
            otherOptions.limit = Math.min(limit, _pageSize);
        }
        if (Number.isFinite(_pageIndex)) {
            otherOptions.offset = _pageIndex * otherOptions.limit;
        }
        return otherOptions;
    }
}
