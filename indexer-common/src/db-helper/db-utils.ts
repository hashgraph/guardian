
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
        offset?: number
    } {
        const otherOptions: any = { limit };
        if(orderField && orderDir) {
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
        otherOptions.limit = Math.min(limit, _pageSize);
        otherOptions.offset = _pageIndex * _pageSize;
        return otherOptions;
    }
}
