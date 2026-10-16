import { filterRootItems } from './formula-view-items';
import { sourceRows } from '../../models/formula-meta';

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

describe('sourceRows', () => {
    it('returns no rows for empty input', () => {
        expect(sourceRows()).toEqual([]);
        expect(sourceRows(null)).toEqual([]);
        expect(sourceRows({})).toEqual([]);
    });

    it('hides empty, null, undefined and whitespace values', () => {
        expect(sourceRows({ methodology: '', section: '   ', equation: null as any, page: undefined })).toEqual([]);
    });

    it('keeps order and trims values', () => {
        expect(sourceRows({ page: ' 12 ', methodology: 'AMS-I.D', equation: '(3)' })).toEqual([
            { label: 'Methodology', value: 'AMS-I.D' },
            { label: 'Equation', value: '(3)' },
            { label: 'Page', value: '12' }
        ]);
    });
});
