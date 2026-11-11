import { SchemaFormComponent } from './schema-form.component';

describe('SchemaFormComponent geo array row', () => {
    const buildRecordText = (item: any, listItem: any) =>
        (SchemaFormComponent.prototype as any)['buildRecordText'].call({}, item, listItem);
    const item = { customType: 'geo', description: 'Project Location(s)' };

    it('titles the row with the field name only and summarizes the value below', () => {
        const value = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] };

        expect(buildRecordText(item, { index2: 3, control: { value } }))
            .toEqual({ title: 'Project Location(s)', sub: '1 polygon · 4 points' });
    });

    it('says Empty for a row without a geometry', () => {
        expect(buildRecordText(item, { index2: 1, control: { value: {} } }))
            .toEqual({ title: 'Project Location(s)', sub: 'Empty' });
    });
});
