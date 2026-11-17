import { recordSummary } from './schema-form-records';

describe('recordSummary', () => {
    it('takes the title from the first scalar and the rest as the subtitle', () => {
        expect(recordSummary(['North', 4, true], 'Row')).toEqual({ title: 'North', sub: '4 · true' });
    });

    it('skips empty values and objects', () => {
        expect(recordSummary([null, undefined, '', {}, [], 'a', 'b'], 'Row')).toEqual({ title: 'a', sub: 'b' });
    });

    it('stops after four values', () => {
        expect(recordSummary(['a', 'b', 'c', 'd', 'e'], 'Row')).toEqual({ title: 'a', sub: 'b · c · d' });
    });

    it('keeps 0 and false', () => {
        expect(recordSummary([0, false], 'Row')).toEqual({ title: '0', sub: 'false' });
    });

    it('falls back to the given title when the row has no scalar', () => {
        expect(recordSummary([null, {}], 'Row #1')).toEqual({ title: 'Row #1', sub: '' });
    });
});
