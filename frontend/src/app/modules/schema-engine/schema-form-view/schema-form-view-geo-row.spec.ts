import { SchemaFormViewComponent } from './schema-form-view.component';

describe('SchemaFormViewComponent geo array row', () => {
    const rowSummary = (item: any, row: any) =>
        (SchemaFormViewComponent.prototype as any).rowSummary.call(
            { rowSummaryCache: new WeakMap(), hide: {}, isRichText: () => false }, item, row, 0);
    const item = { customType: 'geo', description: 'Project Location(s)', fields: [] };

    it('titles the row with the field name only and counts the geometry below', () => {
        const row = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]] };

        expect(rowSummary(item, row)).toEqual({ title: 'Project Location(s)', sub: '2 polygons · 8 points' });
    });

    it('says Empty for a row without a geometry', () => {
        expect(rowSummary(item, {})).toEqual({ title: 'Project Location(s)', sub: 'Empty' });
    });

    it('keeps the numbered title for a sentinel row', () => {
        const sentinel = { customType: 'sentinel', description: 'Imagery', fields: [] };

        expect(rowSummary(sentinel, {}).title).toBe('Imagery #1');
    });
});
