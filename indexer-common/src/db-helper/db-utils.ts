
export class DataBaseUtils {
    public static pageParams(
        pageSize: string | number | undefined,
        pageIndex: string | number | undefined,
        order: string = 'DESC',
        limit: number = 100
    ): {
        orderBy: { [x: string]: string },
        limit: number,
        offset?: number
    } {
        const otherOptions: any = {
            orderBy: { createDate: order },
            limit
        };
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
