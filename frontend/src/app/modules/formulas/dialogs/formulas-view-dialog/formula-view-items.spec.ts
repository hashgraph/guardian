import { filterRootItems } from './formula-view-items';

describe('filterRootItems', () => {
    const items: any[] = [{ uuid: 'a' }, { uuid: 'b' }, { uuid: 'c' }];

    it('returns all items without itemId', () => {
        expect(filterRootItems(items)).toEqual(items);
        expect(filterRootItems(items, null)).toEqual(items);
    });

    it('returns only the matching item', () => {
        expect(filterRootItems(items, 'b')).toEqual([items[1]]);
    });

    it('falls back to all items when not found', () => {
        expect(filterRootItems(items, 'x')).toEqual(items);
    });
});
