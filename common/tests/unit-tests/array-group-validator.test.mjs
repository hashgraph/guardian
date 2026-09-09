import assert from 'node:assert/strict';
import {
    validateArrayGroups,
} from '../../dist/hedera-modules/vcjs/array-group-validator.js';

const lengthLink = {
    field: ['quantification', 'projectInstanceBE'],
    on: ['projectDetails', 'projectLocation'],
    kind: 'array',
};

const mappedLink = {
    ...lengthLink,
    valueMappings: [
        { source: ['projectInstance'], target: ['projectInstanceBE'] },
    ],
};

const secondLink = {
    field: ['monitoring', 'validation'],
    on: ['projectDetails', 'projectLocation'],
    kind: 'array',
};

const subject = (sourceEntries, targetEntries) => ({
    projectDetails: { projectLocation: sourceEntries },
    quantification: { projectInstanceBE: targetEntries },
});

describe('validateArrayGroups — nothing to check', () => {
    it('returns no errors without a subject', () => {
        assert.deepEqual(validateArrayGroups(null, [lengthLink]), []);
    });

    it('returns no errors without a dependency list', () => {
        assert.deepEqual(validateArrayGroups(subject([{}], [{}]), null), []);
    });

    it('returns no errors for an empty dependency list', () => {
        assert.deepEqual(validateArrayGroups(subject([{}], [{}]), []), []);
    });
});

describe('validateArrayGroups — entry counts', () => {
    it('accepts equal lengths', () => {
        assert.deepEqual(validateArrayGroups(subject([{}], [{}]), [lengthLink]), []);
    });

    it('accepts two empty arrays', () => {
        assert.deepEqual(validateArrayGroups(subject([], []), [lengthLink]), []);
    });

    it('rejects a source longer than its dependent, naming both paths and counts', () => {
        const errors = validateArrayGroups(subject([{}, {}], [{}]), [lengthLink]);
        assert.equal(errors.length, 1);
        assert.equal(errors[0].keyword, 'arrayGroupLength');
        assert.equal(errors[0].schemaPath, '#/arrayDependencies');
        assert.equal(errors[0].instancePath, '/quantification/projectInstanceBE');
        assert.equal(
            errors[0].message,
            `'quantification.projectInstanceBE' has 1 entries, ` +
            `but 'projectDetails.projectLocation' has 2.`
        );
    });

    it('rejects a dependent longer than its source with the counts the other way round', () => {
        const errors = validateArrayGroups(subject([{}], [{}, {}]), [lengthLink]);
        assert.equal(errors.length, 1);
        assert.equal(
            errors[0].message,
            `'quantification.projectInstanceBE' has 2 entries, ` +
            `but 'projectDetails.projectLocation' has 1.`
        );
    });

    it('treats a missing dependent as zero entries', () => {
        const errors = validateArrayGroups(
            { projectDetails: { projectLocation: [{}] } },
            [lengthLink]
        );
        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /has 0 entries, but .* has 1\./);
    });

    it('treats two missing arrays as compatible', () => {
        assert.deepEqual(validateArrayGroups({}, [lengthLink]), []);
    });

    it('skips a value that is present but not an array', () => {
        assert.deepEqual(
            validateArrayGroups(subject([{}], 'not-an-array'), [lengthLink]),
            []
        );
    });

    it('checks two declared links independently', () => {
        const errors = validateArrayGroups(
            {
                projectDetails: { projectLocation: [{}, {}] },
                quantification: { projectInstanceBE: [{}] },
                monitoring: { validation: [] },
            },
            [lengthLink, secondLink]
        );
        assert.equal(errors.length, 2);
        assert.deepEqual(
            errors.map((error) => error.instancePath),
            ['/quantification/projectInstanceBE', '/monitoring/validation']
        );
    });
});

describe('validateArrayGroups — copied values', () => {
    it('accepts a dependent value copied from its source', () => {
        assert.deepEqual(
            validateArrayGroups(
                subject([{ projectInstance: 'A' }], [{ projectInstanceBE: 'A' }]),
                [mappedLink]
            ),
            []
        );
    });

    it('rejects a dependent value that diverges from its source', () => {
        const errors = validateArrayGroups(
            subject([{ projectInstance: 'A' }], [{ projectInstanceBE: 'B' }]),
            [mappedLink]
        );
        assert.equal(errors.length, 1);
        assert.equal(errors[0].keyword, 'arrayGroupMapping');
        assert.equal(errors[0].schemaPath, '#/arrayDependencies');
        assert.equal(
            errors[0].instancePath,
            '/quantification/projectInstanceBE/0/projectInstanceBE'
        );
        assert.equal(
            errors[0].message,
            `'quantification.projectInstanceBE[0].projectInstanceBE' is 'B', ` +
            `but must copy 'projectDetails.projectLocation[0].projectInstance' which is 'A'.`
        );
    });

    it('reports one error per diverging entry', () => {
        const errors = validateArrayGroups(
            subject(
                [{ projectInstance: 'A' }, { projectInstance: 'B' }],
                [{ projectInstanceBE: 'x' }, { projectInstanceBE: 'y' }]
            ),
            [mappedLink]
        );
        assert.equal(errors.length, 2);
        assert.deepEqual(
            errors.map((error) => error.instancePath),
            [
                '/quantification/projectInstanceBE/0/projectInstanceBE',
                '/quantification/projectInstanceBE/1/projectInstanceBE',
            ]
        );
    });

    it('prints empty for a missing dependent value against a filled source', () => {
        const errors = validateArrayGroups(
            subject([{ projectInstance: 'A' }], [{}]),
            [mappedLink]
        );
        assert.equal(errors.length, 1);
        assert.equal(
            errors[0].message,
            `'quantification.projectInstanceBE[0].projectInstanceBE' is empty, ` +
            `but must copy 'projectDetails.projectLocation[0].projectInstance' which is 'A'.`
        );
    });

    it('treats undefined, null, empty string and an absent key as the same empty', () => {
        const empties = [
            [{ projectInstance: null }, { projectInstanceBE: '' }],
            [{ projectInstance: '' }, {}],
            [{}, { projectInstanceBE: null }],
            [{ projectInstance: undefined }, { projectInstanceBE: undefined }],
        ];
        for (const [source, target] of empties) {
            assert.deepEqual(
                validateArrayGroups(subject([source], [target]), [mappedLink]),
                []
            );
        }
    });

    it('suppresses pair comparison when the lengths already disagree', () => {
        const errors = validateArrayGroups(
            subject(
                [{ projectInstance: 'A' }, { projectInstance: 'B' }],
                [{ projectInstanceBE: 'wrong' }]
            ),
            [mappedLink]
        );
        assert.equal(errors.length, 1);
        assert.equal(errors[0].keyword, 'arrayGroupLength');
    });

    it('reports nothing for a link without valueMappings', () => {
        assert.deepEqual(
            validateArrayGroups(
                subject([{ projectInstance: 'A' }], [{ projectInstanceBE: 'B' }]),
                [lengthLink]
            ),
            []
        );
    });

    it('skips an entry that is not an object on either side', () => {
        assert.deepEqual(
            validateArrayGroups(subject(['A'], [null]), [mappedLink]),
            []
        );
    });

    it('compares every configured pair of the same link', () => {
        const twoPairs = {
            ...lengthLink,
            valueMappings: [
                { source: ['projectInstance'], target: ['projectInstanceBE'] },
                { source: ['projectSiteCountryarea'], target: ['projectLocation'] },
            ],
        };
        const errors = validateArrayGroups(
            subject(
                [{ projectInstance: 'A', projectSiteCountryarea: 'AF' }],
                [{ projectInstanceBE: 'A', projectLocation: 'AL' }]
            ),
            [twoPairs]
        );
        assert.equal(errors.length, 1);
        assert.equal(
            errors[0].instancePath,
            '/quantification/projectInstanceBE/0/projectLocation'
        );
    });

    it('follows a nested mapping path inside an entry', () => {
        const nested = {
            ...lengthLink,
            valueMappings: [
                { source: ['site', 'country'], target: ['copied', 'country'] },
            ],
        };
        const errors = validateArrayGroups(
            subject([{ site: { country: 'AF' } }], [{ copied: { country: 'AL' } }]),
            [nested]
        );
        assert.equal(errors.length, 1);
        assert.equal(
            errors[0].instancePath,
            '/quantification/projectInstanceBE/0/copied/country'
        );
    });
});
