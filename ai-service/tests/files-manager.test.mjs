import assert from 'node:assert/strict';
import { FilesManager } from '../dist/helpers/files-manager-helper.js';

const policyId = (id) => ({ toString: () => id });

const policy = (id, name, extra = {}) => ({
    _id: policyId(id),
    name,
    description: extra.description,
    typicalProjects: extra.typicalProjects,
    applicabilityConditions: extra.applicabilityConditions,
    importantParameters: extra.importantParameters,
    topicDescription: extra.topicDescription,
    categories: extra.categories,
});

describe('FilesManager.wordsCount', () => {
    it('counts whitespace-separated tokens', () => {
        assert.equal(FilesManager.wordsCount('one two three'), 3);
    });

    it('collapses runs of whitespace', () => {
        assert.equal(FilesManager.wordsCount('one    two\t\nthree'), 3);
    });

    it('returns 0 for empty / whitespace-only strings', () => {
        assert.equal(FilesManager.wordsCount(''), 0);
        assert.equal(FilesManager.wordsCount('   \t  '), 0);
    });

    it('counts a single word', () => {
        assert.equal(FilesManager.wordsCount('lonely'), 1);
    });
});

describe('FilesManager.getFileName', () => {
    it('appends .txt under the given dir', () => {
        assert.equal(FilesManager.getFileName('/tmp/out', 'Methodology'), '/tmp/out/Methodology.txt');
    });

    it('does not normalise weird names (caller responsibility)', () => {
        // documents existing behavior
        assert.equal(FilesManager.getFileName('dir', 'a/b'), 'dir/a/b.txt');
    });
});

describe('FilesManager.getNameByCategoryType', () => {
    it('maps APPLIED_TECHNOLOGY_TYPE', () => {
        assert.match(
            FilesManager.getNameByCategoryType('APPLIED_TECHNOLOGY_TYPE'),
            /Applied Technology/i
        );
    });

    it('maps MITIGATION_ACTIVITY_TYPE', () => {
        assert.match(
            FilesManager.getNameByCategoryType('MITIGATION_ACTIVITY_TYPE'),
            /Mitigation Activity/i
        );
    });

    it('maps PROJECT_SCALE', () => {
        assert.match(FilesManager.getNameByCategoryType('PROJECT_SCALE'), /Scale/i);
    });

    it('maps SECTORAL_SCOPE', () => {
        assert.match(FilesManager.getNameByCategoryType('SECTORAL_SCOPE'), /Sectoral/i);
    });

    it('maps SUB_TYPE', () => {
        assert.match(FilesManager.getNameByCategoryType('SUB_TYPE'), /Sub Type/i);
    });

    it("returns '' for an unknown type", () => {
        assert.equal(FilesManager.getNameByCategoryType('NOPE'), '');
    });
});

describe('FilesManager.getCategoryRowByType', () => {
    const cats = [
        { id: 'c1', type: 'PROJECT_SCALE', name: 'Small' },
        { id: 'c2', type: 'SECTORAL_SCOPE', name: 'Energy' },
    ];

    it('returns "" when policy has no categories', () => {
        const p = policy('p1', 'X', { categories: [] });
        assert.equal(FilesManager.getCategoryRowByType(p, cats, 'PROJECT_SCALE', 'by scale'), '');
    });

    it('returns "" when no matching category is found', () => {
        const p = policy('p1', 'X', { categories: ['nope'] });
        assert.equal(FilesManager.getCategoryRowByType(p, cats, 'PROJECT_SCALE', 'by scale'), '');
    });

    it('emits a line containing the matched category name', () => {
        const p = policy('p1', 'X', { categories: ['c1'] });
        const row = FilesManager.getCategoryRowByType(p, cats, 'PROJECT_SCALE', 'by scale');
        assert.match(row, /X by scale: Small/);
    });
});

describe('FilesManager.getFileData', () => {
    it("returns '' when no fields contribute any content", () => {
        const p = policy('p1', 'Empty');
        assert.equal(FilesManager.getFileData(p, [], []), '');
    });

    it('prefixes "Methodology name:" when content is non-empty', () => {
        const p = policy('p1', 'My Methodology', { description: 'A short description.' });
        const out = FilesManager.getFileData(p, [], []);
        assert.match(out, /^Methodology name: My Methodology/);
        assert.match(out, /A short description\./);
    });

    it('decorates the methodology name with topicDescription when set', () => {
        const p = policy('p1', 'M', { description: 'd', topicDescription: 'TopicDesc' });
        const out = FilesManager.getFileData(p, [], []);
        assert.match(out, /Methodology name: M \(TopicDesc\)/);
    });

    it('appends typicalProjects, applicabilityConditions, and importantParameters when provided', () => {
        const p = policy('p1', 'M', {
            description: 'd',
            typicalProjects: 'projects-X',
            applicabilityConditions: 'conds-Y',
            importantParameters: { atValidation: 'AV', monitored: 'MON' },
        });
        const out = FilesManager.getFileData(p, [], []);
        assert.match(out, /Typical projects:/);
        assert.match(out, /projects-X/);
        assert.match(out, /Important conditions/);
        assert.match(out, /conds-Y/);
        assert.match(out, /Important parameters:/);
        assert.match(out, /At validation:/);
        assert.match(out, /AV/);
        assert.match(out, /Monitored:/);
        assert.match(out, /MON/);
    });

    it('appends descriptions if any are passed', () => {
        const p = policy('p1', 'M', { description: 'd' });
        const out = FilesManager.getFileData(p, [], ['extra-desc-1', 'extra-desc-2']);
        assert.match(out, /extra-desc-1/);
        assert.match(out, /extra-desc-2/);
    });
});

describe('FilesManager.getMetadataContent', () => {
    it('returns "" when no policies match any category', () => {
        const cats = [{ id: 'c1', type: 'PROJECT_SCALE', name: 'Small' }];
        const policies = [policy('p1', 'P1', { categories: [] })];
        assert.equal(FilesManager.getMetadataContent(policies, cats), '');
    });

    it('groups categories by type and lists the policies under each', () => {
        const cats = [
            { id: 'c1', type: 'PROJECT_SCALE', name: 'Small' },
            { id: 'c2', type: 'PROJECT_SCALE', name: 'Large' },
            { id: 'c3', type: 'SECTORAL_SCOPE', name: 'Energy' },
        ];
        const policies = [
            policy('p1', 'PA', { categories: ['c1'] }),
            policy('p2', 'PB', { categories: ['c2'] }),
            policy('p3', 'PC', { categories: ['c1', 'c3'] }),
        ];
        const out = FilesManager.getMetadataContent(policies, cats);
        // Project scale group header is included
        assert.match(out, /Categorization Methodologies by Scale/);
        assert.match(out, /Small: PA, PC/);
        assert.match(out, /Large: PB/);
        // Sectoral group header
        assert.match(out, /Sectoral Scope/i);
        assert.match(out, /Energy: PC/);
    });

    it('skips a category when no policy references it', () => {
        const cats = [
            { id: 'c1', type: 'PROJECT_SCALE', name: 'UsedScale' },
            { id: 'c2', type: 'PROJECT_SCALE', name: 'UnusedScale' },
        ];
        const policies = [policy('p1', 'PA', { categories: ['c1'] })];
        const out = FilesManager.getMetadataContent(policies, cats);
        assert.match(out, /UsedScale: PA/);
        assert.doesNotMatch(out, /UnusedScale/);
    });
});
