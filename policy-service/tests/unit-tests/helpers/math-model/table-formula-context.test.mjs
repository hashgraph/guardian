import assert from 'node:assert/strict';
import {
    DocumentMap,
    FieldLink,
    MathContext,
    MathFormula
} from '../../../../dist/policy-engine/helpers/math-model/index.js';

const marker = (overrides = {}) => ({
    type: 'table',
    fileId: 'table-file',
    columnKeys: ['year', 'area.total', 'factor', 'device'],
    columnNames: ['Year', 'Area', 'Factor', 'Device'],
    ...overrides
});

const rows = [
    { year: '2020', 'area.total': '10', factor: '2', device: 'A' },
    { year: '2021', 'area.total': 'n/a', factor: '3', device: 'B' },
    { year: '2022', 'area.total': '30', factor: '4', device: 'C' },
    { year: '2023', 'area.total': '', factor: '1.5', device: 'D' },
    { year: '2024', 'area.total': '50', factor: '2', device: 'E' },
    { year: '2025', 'area.total': '60', factor: '0.5', device: 'F' }
];

const tablePack = {
    'table-file': {
        columnKeys: ['year', 'area.total', 'factor', 'device'],
        rows
    }
};

function link(name, path, schema = 'schema') {
    const item = new FieldLink(name, path);
    item.schema = schema;
    item.update();
    return item;
}

function formula(name, body) {
    const item = new MathFormula(name, body);
    item.update();
    return item;
}

function documentMap(document) {
    const documents = new DocumentMap();
    documents.addDocument({ schema: 'schema', document });
    return documents;
}

describe('MathContext Table columns', () => {
    it('sums a dotted-key column and reports numeric replacements', () => {
        const table = JSON.stringify(marker());
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            formula('total', '\\sum{\\operatorname{area}}')
        ]);

        const result = context.setDocument(documentMap({ siteTable: table }), tablePack);

        assert.equal(result.scope.total, 150);
        assert.deepEqual(result.scope.area, ['10', 'n/a', '30', '', '50', '60']);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        ]);
        assert.equal(JSON.parse(table).rows, undefined);
    });

    it('keeps one replacement warning for each physical Table column', () => {
        const otherPack = {
            ...tablePack,
            'other-file': {
                columnKeys: ['area.total'],
                rows: [
                    { 'area.total': 'n/a' },
                    { 'area.total': '5' }
                ]
            }
        };
        const context = new MathContext([
            link('areaA', 'siteTable.area.total'),
            link('areaB', 'otherTable.area.total'),
            formula('totalA', '\\sum{\\operatorname{areaA}}'),
            formula('totalB', '\\sum{\\operatorname{areaB}}')
        ]);

        const result = context.setDocument(documentMap({
            siteTable: JSON.stringify(marker()),
            otherTable: JSON.stringify(marker({
                fileId: 'other-file',
                columnKeys: ['area.total'],
                columnNames: ['Area']
            }))
        }), otherPack);
        const warnings = context.getWarnings();

        assert.equal(result.scope.totalA, 150);
        assert.equal(result.scope.totalB, 5);
        assert.equal(warnings.length, 2);
        assert.ok(warnings.includes('Table column "Area" replaced 2 nonnumeric cells with 0.'));
        assert.ok(warnings.includes('Table column "Area" replaced 1 nonnumeric cells with 0.'));
    });

    it('keeps one warning when two variables read the same Table column', () => {
        const context = new MathContext([
            link('areaA', 'siteTable.area.total'),
            link('areaB', 'siteTable.area.total'),
            formula('totalA', '\\sum{\\operatorname{areaA}}'),
            formula('totalB', '\\sum{\\operatorname{areaB}}')
        ]);

        const result = context.setDocument(
            documentMap({ siteTable: JSON.stringify(marker()) }),
            tablePack
        );

        assert.equal(result.scope.totalA, 150);
        assert.equal(result.scope.totalB, 150);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        ]);
    });

    it('returns numbers and text from Table-only Lookup', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('year', 'siteTable.year'),
            link('device', 'siteTable.device'),
            formula('areaResult', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2024}\\right)'),
            formula('combinedResult', '\\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2020}\\right) + \\mathrm{Lookup}\\left(\\operatorname{area},\\operatorname{year},\\text{2024}\\right)'),
            formula('deviceResult', '\\mathrm{Lookup}\\left(\\operatorname{device},\\operatorname{year},\\text{2021}\\right)')
        ]);

        const result = context.setDocument(
            documentMap({ siteTable: JSON.stringify(marker()) }),
            tablePack
        );

        assert.equal(result.scope.areaResult, 50);
        assert.equal(result.scope.combinedResult, 60);
        assert.equal(result.scope.deviceResult, 'B');
        assert.deepEqual(context.getWarnings(), []);
    });

    it('uses numeric Table values through At without losing row alignment', () => {
        const context = new MathContext([
            link('area', 'siteTable.area.total'),
            link('factor', 'siteTable.factor'),
            formula(
                'total',
                '\\sum_{i=1}^{\\operatorname{Length}\\left(\\operatorname{area}\\right)} '
                + '\\operatorname{At}\\left(\\operatorname{area},i\\right) '
                + '\\cdot \\operatorname{At}\\left(\\operatorname{factor},i\\right)'
            )
        ]);

        const result = context.setDocument(
            documentMap({ siteTable: JSON.stringify(marker()) }),
            tablePack
        );

        assert.equal(result.scope.total, 270);
        assert.equal(result.scope.area.length, 6);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Area" replaced 2 nonnumeric cells with 0.'
        ]);
    });

    it('keeps every tested non-Table result after a Table column is added', () => {
        const run = (withTableColumn) => {
            const items = [
                link('ordinary', 'ordinary'),
                link('ordinaryKeys', 'ordinaryKeys'),
                link('ordinaryText', 'ordinaryText'),
                formula('total', '\\sum{\\operatorname{ordinary}}'),
                formula(
                    'indexedTotal',
                    '\\sum_{i=1}^{2} \\operatorname{At}\\left(\\operatorname{ordinary},i\\right)'
                ),
                formula('selected', '\\operatorname{At}\\left(\\operatorname{ordinary},2\\right)'),
                formula('matched', '\\mathrm{Lookup}\\left(\\operatorname{ordinary},\\operatorname{ordinaryKeys},\\text{b}\\right)'),
                formula('missing', '\\mathrm{Lookup}\\left(\\operatorname{ordinary},\\operatorname{ordinaryKeys},\\text{z}\\right)'),
                formula('textValue', '\\mathrm{Lookup}\\left(\\operatorname{ordinaryText},\\operatorname{ordinaryKeys},\\text{b}\\right)')
            ];
            if (withTableColumn) {
                items.unshift(link('year', 'siteTable.year'));
            }
            const context = new MathContext(items);
            const result = context.setDocument(documentMap({
                siteTable: JSON.stringify(marker()),
                ordinary: [4, 5],
                ordinaryKeys: ['a', 'b'],
                ordinaryText: ['x', 'y']
            }), tablePack);
            return {
                values: {
                    total: result.scope.total,
                    indexedTotal: result.scope.indexedTotal,
                    selected: result.scope.selected,
                    matched: result.scope.matched,
                    missing: result.scope.missing,
                    textValue: result.scope.textValue
                },
                warnings: context.getWarnings()
            };
        };

        const withoutTable = run(false);
        const withTable = run(true);

        assert.deepEqual(withoutTable.values, {
            total: 9,
            indexedTotal: 9,
            selected: 5,
            matched: 5,
            missing: 0,
            textValue: 0
        });
        assert.deepEqual(withTable, withoutTable);
        assert.deepEqual(withTable.warnings, []);
    });

    it('leaves a Table without declared columns on the old path', () => {
        const stored = JSON.stringify({ type: 'table', fileId: 'legacy-file' });
        const context = new MathContext([link('legacy', 'siteTable')]);

        const result = context.setDocument(documentMap({ siteTable: stored }), {
            'legacy-file': { columnKeys: ['Year'], rows: [{ Year: '2020' }] }
        });

        assert.equal(result.scope.legacy, stored);
        assert.deepEqual(context.getWarnings(), []);
    });

    it('rejects a declared column when its packed rows are missing', () => {
        const context = new MathContext([link('area', 'siteTable.area.total')]);

        assert.throws(
            () => context.setDocument(
                documentMap({ siteTable: JSON.stringify(marker()) }),
                {}
            ),
            /Table column "Area" data is unavailable/
        );
    });

    const cohortMarker = JSON.stringify({
        type: 'table',
        fileId: 'cohort-file',
        columnKeys: ['instanceId', 'year', 'delta'],
        columnNames: ['Cohort', 'Year', 'Delta']
    });
    const cohortPack = {
        'cohort-file': {
            columnKeys: ['instanceId', 'year', 'delta'],
            rows: [
                { instanceId: 'C1', year: '2020', delta: '100' },
                { instanceId: 'C1', year: '2021', delta: '150' },
                { instanceId: 'C2', year: '2021', delta: '80' }
            ]
        }
    };
    const cohortLinks = () => [
        link('inst', 'area.instanceId'),
        link('year', 'area.year'),
        link('delta', 'area.delta')
    ];

    it('finds the previous-year value with LookupTwo over Table columns', () => {
        const context = new MathContext([
            ...cohortLinks(),
            formula(
                'prevYear',
                '\\mathrm{Map}\\left(1..\\mathrm{Length}\\left(\\mathrm{year}\\right),\\ \\mathrm{i} \\mapsto '
                + '\\mathrm{At}\\left(\\mathrm{year},\\ \\mathrm{i}\\right) - 1\\right)'
            ),
            formula(
                'deltaPrev',
                '\\mathrm{Map}\\left(1..\\mathrm{Length}\\left(\\mathrm{year}\\right),\\ \\mathrm{i} \\mapsto '
                + '\\mathrm{LookupTwo}\\left(\\mathrm{delta},\\ \\mathrm{inst},\\ \\mathrm{At}\\left(\\mathrm{inst},\\ \\mathrm{i}\\right),'
                + '\\ \\mathrm{year},\\ \\mathrm{At}\\left(\\mathrm{prevYear},\\ \\mathrm{i}\\right)\\right)\\right)'
            )
        ]);

        const result = context.setDocument(documentMap({ area: cohortMarker }), cohortPack);

        assert.deepEqual(result.scope.prevYear, [2019, 2020, 2020]);
        assert.deepEqual(result.scope.deltaPrev, [0, 100, 0]);
        assert.deepEqual(context.getWarnings(), []);
    });

    it('keeps a text key read with At inside Lookup', () => {
        const context = new MathContext([
            ...cohortLinks(),
            formula(
                'firstDelta',
                '\\mathrm{Lookup}\\left(\\mathrm{delta},\\ \\mathrm{inst},\\ \\mathrm{At}\\left(\\mathrm{inst},\\ 3\\right)\\right)'
            )
        ]);

        const result = context.setDocument(documentMap({ area: cohortMarker }), cohortPack);

        assert.equal(result.scope.firstDelta, 80);
        assert.deepEqual(context.getWarnings(), []);
    });

    it('reads Table columns as numbers and text in LookupMin, LookupMax and EqualString', () => {
        const context = new MathContext([
            ...cohortLinks(),
            formula(
                'firstC1',
                '\\mathrm{LookupMin}\\left(\\mathrm{delta},\\ \\mathrm{inst},\\ \\mathrm{At}\\left(\\mathrm{inst},\\ 1\\right),\\ \\mathrm{year}\\right)'
            ),
            formula(
                'lastC1',
                '\\mathrm{LookupMax}\\left(\\mathrm{delta},\\ \\mathrm{inst},\\ \\mathrm{At}\\left(\\mathrm{inst},\\ 1\\right),\\ \\mathrm{year}\\right)'
            ),
            formula(
                'isC2',
                '\\mathrm{EqualString}\\left(\\mathrm{At}\\left(\\mathrm{inst},\\ 3\\right),\\ \\text{C2}\\right)'
            )
        ]);

        const result = context.setDocument(documentMap({ area: cohortMarker }), cohortPack);

        assert.equal(result.scope.firstC1, 100);
        assert.equal(result.scope.lastC1, 150);
        assert.equal(result.scope.isC2, 1);
    });

    it('still turns text into 0 with a warning when At is used in arithmetic', () => {
        const context = new MathContext([
            ...cohortLinks(),
            formula('wrong', '\\mathrm{At}\\left(\\mathrm{inst},\\ 1\\right) + 1')
        ]);

        const result = context.setDocument(documentMap({ area: cohortMarker }), cohortPack);

        assert.equal(result.scope.wrong, 1);
        assert.deepEqual(context.getWarnings(), [
            'Table column "Cohort" replaced 3 nonnumeric cells with 0.'
        ]);
    });

    it('rejects a declared column above the shared row limit', () => {
        const context = new MathContext([link('area', 'siteTable.area.total')]);
        const largeRows = Array.from({ length: 10001 }, (_, index) => ({
            'area.total': String(index)
        }));

        assert.throws(
            () => context.setDocument(
                documentMap({ siteTable: JSON.stringify(marker()) }),
                {
                    'table-file': {
                        columnKeys: ['area.total'],
                        rows: largeRows
                    }
                }
            ),
            /Table column "Area" has 10001 rows; General formulas are limited to 10000/
        );
    });
});
