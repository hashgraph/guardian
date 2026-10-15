import { FormulaItemType, IFormulaConfig } from '@guardian/interfaces';
import { Formulas, highlightSegments, latexToPlain } from './formulas';

function field(name: string, description: string = '') {
    return { name, title: name, description, type: 'string' } as any;
}

function createConfig(): IFormulaConfig {
    return {
        formulas: [
            { uuid: 'c1', type: FormulaItemType.Constant, name: 'GWP_{CH4}', value: '28', description: 'Global warming potential of methane' },
            { uuid: 'c2', type: FormulaItemType.Constant, name: 'GWP_{N2O}', value: '265', description: '' },
            {
                uuid: 'v1', type: FormulaItemType.Variable, name: '\\Delta CO2\\_soil_{bsl,t}', value: '', description: 'Baseline change',
                link: {
                    type: 'schema', entityId: 's1', item: 'f1',
                    condition: { field: field('projectType', 'Project type'), fieldValue: 'Wetland restoration' }
                }
            },
            {
                uuid: 'f1', type: FormulaItemType.Formula, name: 'CH4\\_soil_{bsl}', value: '\\sum_{i}(A_{i})\\times CH4\\_soil', description: '',
                link: { type: 'schema', entityId: 's1', item: 'f2' }, relationships: []
            },
            {
                uuid: 't1', type: FormulaItemType.Text, name: 'Note', value: 'Apply the uncertainty deduction', description: '',
                link: null, relationships: []
            },
            {
                uuid: 'f2', type: FormulaItemType.Formula, name: 'ER', value: 'a+b', description: 'Net emission reductions',
                link: {
                    type: 'schema', entityId: 's1', item: 'f3',
                    condition: {
                        AND: [
                            { field: field('a', 'Alpha'), fieldValue: 'one' },
                            { field: field('b', 'Beta'), fieldValue: 'two', comparator: 'contains' }
                        ]
                    }
                }, relationships: []
            },
        ] as any,
        files: []
    };
}

function createModel(): Formulas {
    const model = new Formulas();
    model.labelFn = (item) => item.link ? { entity: 'Net_ERR_Calculation', field: `Field ${item.link.item}` } : null;
    model.fromData(createConfig());
    return model;
}

function uuids(model: Formulas): string[] {
    return model.data.map((e) => e.uuid);
}

describe('latexToPlain', () => {
    it('should unescape underscores', () => {
        expect(latexToPlain('CH4\\_soil')).toBe('CH4_soil');
    });

    it('should turn commands into words', () => {
        expect(latexToPlain('\\Delta CO2')).toBe('Delta CO2');
        expect(latexToPlain('\\sum_{i}(x)\\times y')).toBe('sum _ i (x) times y');
    });

    it('should drop braces, carets and backslashes and collapse spaces', () => {
        expect(latexToPlain('x^{2}  +  {y}\\')).toBe('x 2 + y');
        expect(latexToPlain(null)).toBe('');
        expect(latexToPlain(undefined)).toBe('');
    });
});

describe('highlightSegments', () => {
    it('should mark terms ignoring case', () => {
        expect(highlightSegments('Soil pool', ['soil', 'oo'])).toEqual([
            { text: 'Soil', mark: true },
            { text: ' p', mark: false },
            { text: 'oo', mark: true },
            { text: 'l', mark: false },
        ]);
    });

    it('should return the text as is without matches', () => {
        expect(highlightSegments('abc', ['x'])).toEqual([{ text: 'abc', mark: false }]);
        expect(highlightSegments('', ['x'])).toEqual([]);
    });
});

describe('Formulas search', () => {
    let model: Formulas;

    beforeEach(() => {
        model = createModel();
    });

    it('should show everything without a query', () => {
        expect(model.data.length).toBe(6);
        expect(model.total).toBe(6);
        expect(model.isFiltering).toBe(false);
        expect(model.counts).toEqual({ constant: 2, variable: 1, formula: 2, text: 1 });
    });

    it('should match a latex name as plain text with several words', () => {
        model.setQuery('ch4 soil');
        expect(uuids(model)).toEqual(['f1']);
        model.setQuery('delta soil');
        expect(uuids(model)).toEqual(['v1']);
    });

    it('should be case-insensitive', () => {
        model.setQuery('GWP');
        expect(uuids(model)).toEqual(['c1', 'c2']);
        model.setQuery('gwp');
        expect(uuids(model)).toEqual(['c1', 'c2']);
    });

    it('should require every term to match some part', () => {
        model.setQuery('gwp methane');
        expect(uuids(model)).toEqual(['c1']);
        model.setQuery('gwp nothing');
        expect(uuids(model)).toEqual([]);
    });

    it('should match the constant value', () => {
        model.setQuery('265');
        expect(uuids(model)).toEqual(['c2']);
    });

    it('should match the text value', () => {
        model.setQuery('uncertainty');
        expect(uuids(model)).toEqual(['t1']);
        expect(model.meta.get('t1')?.hit?.label).toBe('Text');
    });

    it('should match the formula value as plain text', () => {
        model.setQuery('times');
        expect(uuids(model)).toEqual(['f1']);
        expect(model.meta.get('f1')?.hit?.label).toBe('Formula');
    });

    it('should match the link label', () => {
        model.setQuery('net_err field f3');
        expect(uuids(model)).toEqual(['f2']);
    });

    it('should match the display condition', () => {
        model.setQuery('wetland');
        expect(uuids(model)).toEqual(['v1']);
        expect(model.meta.get('v1')?.hit?.label).toBe('Shown if');
        model.setQuery('beta contains two');
        expect(uuids(model)).toEqual(['f2']);
    });

    it('should match the description', () => {
        model.setQuery('emission reductions');
        expect(uuids(model)).toEqual(['f2']);
        expect(model.meta.get('f2')?.hit?.label).toBe('Description');
    });

    it('should not repeat a visible match in the hit line', () => {
        model.setQuery('methane');
        expect(uuids(model)).toEqual(['c1']);
        expect(model.meta.get('c1')?.hit).toBeNull();
        model.setQuery('net_err');
        expect(model.meta.get('f1')?.hit).toBeNull();
    });

    it('should build row data', () => {
        const constant = model.meta.get('c1')!;
        expect(constant.subText).toBe('= 28 · Global warming potential of methane');
        expect(model.meta.get('t1')?.noLink).toBe(true);
        expect(model.meta.get('f1')?.subText).toBe('Net_ERR_Calculation: Field f2');
    });

    it('should mark the terms in the row data', () => {
        model.setQuery('methane');
        const marked = model.meta.get('c1')!.sub.filter((e) => e.mark).map((e) => e.text);
        expect(marked).toEqual(['methane']);
    });

    it('should count the types of the query result only', () => {
        model.setQuery('ch4');
        expect(model.counts).toEqual({ constant: 1, variable: 0, formula: 1, text: 0 });
        model.setFilters({ constant: false, variable: true, formula: true, text: true });
        expect(model.counts).toEqual({ constant: 1, variable: 0, formula: 1, text: 0 });
        expect(uuids(model)).toEqual(['f1']);
    });

    it('should combine the filters and the query', () => {
        model.setFilters({ constant: true, variable: false, formula: true, text: true });
        expect(uuids(model)).toEqual(['c1', 'c2', 'f1', 't1', 'f2']);
        model.setQuery('soil');
        expect(uuids(model)).toEqual(['f1']);
        expect(model.counts.variable).toBe(1);
        expect(model.isFiltering).toBe(true);
        model.setQuery('');
        model.setFilters({ constant: true, variable: true, formula: true, text: true });
        expect(model.isFiltering).toBe(false);
        expect(model.data.length).toBe(6);
    });
});

describe('Formulas reorder and edit', () => {
    let model: Formulas;

    beforeEach(() => {
        model = createModel();
    });

    it('should reorder the unfiltered list', () => {
        model.reorder(0, 3);
        expect(model.all.map((e) => e.uuid)).toEqual(['c2', 'v1', 'f1', 'c1', 't1', 'f2']);
        expect(uuids(model)).toEqual(['c2', 'v1', 'f1', 'c1', 't1', 'f2']);
        model.reorder(5, 0);
        expect(model.all.map((e) => e.uuid)).toEqual(['f2', 'c2', 'v1', 'f1', 'c1', 't1']);
    });

    it('should add, duplicate and delete', () => {
        const added = model.add(FormulaItemType.Constant);
        expect(model.total).toBe(7);
        expect(model.all[6]).toBe(added);

        const original = model.getItem('f2')!;
        const copy = model.duplicate(original)!;
        expect(copy.uuid).not.toBe(original.uuid);
        expect(copy.name).toBe(original.name);
        expect(copy.link).toEqual(original.link);
        expect(copy.link).not.toBe(original.link);
        expect(model.indexOf(copy)).toBe(model.indexOf(original) + 1);

        model.delete(copy);
        expect(model.getItem(copy.uuid)).toBeNull();
        expect(model.total).toBe(7);
    });

    it('should keep the saved json shape', () => {
        const json = model.getJson();
        expect(json.formulas?.length).toBe(6);
        expect(json.files).toEqual([]);
        expect(json.formulas?.[0]).toEqual(createConfig().formulas?.[0]);
    });

    it('should search by source fields', () => {
        model.getItem('c1')!.source = { methodology: 'VM0042 v2.1', section: '8.1.2 Baseline', page: '34' };
        model.update();
        model.setQuery('vm0042');
        expect(uuids(model)).toEqual(['c1']);
        expect(model.meta.get('c1')?.hit?.label).toBe('Source');
        model.setQuery('baseline 34');
        expect(uuids(model)).toEqual(['c1']);
    });

    it('should not add source to items without it', () => {
        const json = model.getJson();
        for (const item of json.formulas || []) {
            expect('source' in item).toBe(false);
        }
        expect(json.formulas).toEqual(createConfig().formulas);
    });
});
