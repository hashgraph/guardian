import { DataBaseUtils } from '@indexer/common';
import { PageFilters } from '@indexer/interfaces';

export function parsePageParams(msg: PageFilters, limit = 100) {
    return DataBaseUtils.pageParams(
        msg.pageSize,
        msg.pageIndex,
        limit,
        msg.orderField,
        msg.orderDir
    );
}
