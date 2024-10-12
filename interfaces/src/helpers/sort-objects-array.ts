import { OrderDirection } from '../type/index.js';

/**
 * Sort objects array
 * @param array Array
 * @param field Field
 * @param direction Order direction
 * @returns Array
 */
export function sortObjectsArray<T>(
    array: T[],
    field: string,
    direction: OrderDirection = OrderDirection.ASC
) {
    return array.sort((a, b) =>
        direction === OrderDirection.ASC
            ? a[field] - b[field]
            : b[field] - a[field]
    );
}
