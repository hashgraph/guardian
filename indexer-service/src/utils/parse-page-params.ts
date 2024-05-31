import { DataBaseUtils } from '@indexer/common';
import { IPageFilters } from '@indexer/interfaces';

export function parsePageParams(msg: IPageFilters, limit = 100) {
    return DataBaseUtils.pageParams(
        msg.pageSize,
        msg.pageIndex,
        limit,
        msg.orderField,
        msg.orderDir
    );
}
