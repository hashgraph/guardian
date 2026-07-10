import assert from 'node:assert/strict';
import { FilesManager } from '../dist/helpers/files-manager-helper.js';

const policy = (overrides = {}) => ({
    _id: { toString: () => 'p1' },
    name: 'Methodology Alpha',
    topicDescription: undefined,
    description: undefined,
    typicalProjects: undefined,
    applicabilityConditions: undefined,
    importantParameters: undefined,
    categories: [],
    ...overrides,
});

describe('FilesManager.wordsCount', () => {
    it('counts whitespace-separated words', () => {
        assert.equal(FilesManager.wordsCount('one two three'), 3);
    });

    it('returns 0 for an empty/whitespace-only string', () => {
        assert.equal(FilesManager.wordsCount(''), 0);
        assert.equal(FilesManager.wordsCount('   '), 0);
    });

    it('collapses multiple separators', () => {
        assert.equal(FilesManager.wordsCount('a   b\t\nc'), 3);
    });
});

describe('FilesManager.getFileName', () => {
    it('joins dir + name with .txt suffix', () => {
        assert.equal(FilesManager.getFileName('/tmp/out', 'M1'), '/tmp/out/M1.txt');
    });
});

describe('FilesManager.getNameByCategoryType', () => {
    it('maps known category types to human labels', () => {
        assert.equal(
            FilesManager.getNameByCategoryType('APPLIED_TECHNOLOGY_TYPE'),
            'Categorization Methodologies by Applied Technology Type/Measure'
        );
        assert.equal(
            FilesManager.getNameByCategoryType('SECTORAL_SCOPE'),
            'Methodologies Sectoral Scope Name'
        );
        assert.equal(
            FilesManager.getNameByCategoryType('SUB_TYPE'),
            'Categorization Methodologies by Sub Type'
        );
    });

    it('returns empty string for unknown types', () => {
        assert.equal(FilesManager.getNameByCategoryType('NOT_A_TYPE'), '');
        assert.equal(FilesManager.getNameByCategoryType(undefined), '');
    });
});

describe('FilesManager.getCategoryRowByType', () => {
    const cats = [
        { id: 'c1', type: 'PROJECT_SCALE', name: 'Small' },
        { id: 'c2', type: 'SECTORAL_SCOPE', name: 'Energy' },
    ];

    it('returns a formatted row when the policy has a matching category', () => {
        const row = FilesManager.getCategoryRowByType(
            policy({ categories: ['c1'] }),
            cats,
            'PROJECT_SCALE',
            'methodology by scale type'
        );
        assert.equal(row, '\n Methodology Alpha methodology by scale type: Small \n');
    });

    it('returns "" when policy has no categories', () => {
        const row = FilesManager.getCategoryRowByType(policy(), cats, 'PROJECT_SCALE', 'x');
        assert.equal(row, '');
    });

    it('returns "" when no category of the requested type matches', () => {
        const row = FilesManager.getCategoryRowByType(
            policy({ categories: ['c2'] }),
            cats,
            'PROJECT_SCALE',
            'x'
        );
        assert.equal(row, '');
    });
});

describe('FilesManager.getFileData', () => {
    it('returns "" for a policy with no descriptive content', () => {
        const result = FilesManager.getFileData(policy(), [], []);
        assert.equal(result, '');
    });

    it('prepends "Methodology name: <name>" when there is content', () => {
        const result = FilesManager.getFileData(
            policy({ description: 'About methodology' }),
            [],
            []
        );
        assert.ok(result.startsWith('Methodology name: Methodology Alpha\n'));
        assert.ok(result.includes('About methodology'));
    });

    it('appends typicalProjects, applicabilityConditions, and importantParameters', () => {
        const result = FilesManager.getFileData(
            policy({
                typicalProjects: 'forestry',
                applicabilityConditions: 'permit',
                importantParameters: { atValidation: 'X', monitored: 'Y' },
            }),
            [],
            []
        );
        assert.ok(result.includes('Typical projects:'));
        assert.ok(result.includes('forestry'));
        assert.ok(result.includes('Important conditions'));
        assert.ok(result.includes('At validation:'));
        assert.ok(result.includes('Monitored:'));
    });

    it('includes the description block', () => {
        const result = FilesManager.getFileData(
            policy({ description: 'Some description' }),
            [],
            ['Extra description with enough words to satisfy the helper.']
        );
        assert.ok(result.includes('Some description'));
        assert.ok(result.includes('Extra description'));
    });

    it('parenthesizes the topicDescription on the methodology name line', () => {
        const result = FilesManager.getFileData(
            policy({ description: 'd', topicDescription: 'subtopic' }),
            [],
            []
        );
        assert.ok(result.startsWith('Methodology name: Methodology Alpha (subtopic)'));
    });
});

describe('FilesManager.getMetadataContent', () => {
    const categories = [
        { id: 'c1', type: 'PROJECT_SCALE', name: 'Small' },
        { id: 'c2', type: 'PROJECT_SCALE', name: 'Large' },
        { id: 'c3', type: 'SECTORAL_SCOPE', name: 'Energy' },
    ];

    it('returns "" when no policies match any category', () => {
        const result = FilesManager.getMetadataContent([], categories);
        assert.equal(result, '');
    });

    it('groups policies under their category headers', () => {
        const policies = [
            policy({ name: 'Pa', categories: ['c1'] }),
            policy({ name: 'Pb', categories: ['c2'] }),
            policy({ name: 'Pc', categories: ['c3'] }),
        ];
        const result = FilesManager.getMetadataContent(policies, categories);
        assert.ok(result.includes('Categorization Methodologies by Scale'));
        assert.ok(result.includes('Methodologies Sectoral Scope Name'));
        assert.ok(result.includes('Small: Pa'));
        assert.ok(result.includes('Large: Pb'));
        assert.ok(result.includes('Energy: Pc'));
    });

    it('skips categories that no policy maps to', () => {
        const policies = [policy({ name: 'Pa', categories: ['c1'] })];
        const result = FilesManager.getMetadataContent(policies, categories);
        assert.ok(result.includes('Small: Pa'));
        assert.ok(!result.includes('Large:'));
        assert.ok(!result.includes('Energy:'));
    });
});
