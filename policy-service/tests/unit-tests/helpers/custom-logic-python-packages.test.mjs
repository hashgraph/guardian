import { assert } from 'chai';
import {
    PYTHON_PACKAGES,
    IMPORT_TO_PACKAGE,
    selectPackagesForImports,
} from '../../../dist/policy-engine/helpers/workers/python-packages.js';

describe('custom logic python-packages helpers', () => {
    describe('PYTHON_PACKAGES allowlist', () => {
        it('is a non-empty list of unique package names', () => {
            assert.isArray(PYTHON_PACKAGES);
            assert.isAbove(PYTHON_PACKAGES.length, 0);
            assert.equal(new Set(PYTHON_PACKAGES).size, PYTHON_PACKAGES.length);
        });

        it('includes the scientific packages user scripts rely on', () => {
            for (const pkg of ['numpy', 'pandas', 'scipy', 'scikit-learn']) {
                assert.include(PYTHON_PACKAGES, pkg);
            }
        });
    });

    describe('IMPORT_TO_PACKAGE map', () => {
        it('maps the sklearn import name to the scikit-learn package', () => {
            assert.equal(IMPORT_TO_PACKAGE.sklearn, 'scikit-learn');
        });

        it('has a null prototype so prototype keys do not resolve', () => {
            assert.isNull(Object.getPrototypeOf(IMPORT_TO_PACKAGE));
            assert.isUndefined(IMPORT_TO_PACKAGE.constructor);
            assert.isUndefined(IMPORT_TO_PACKAGE.__proto__);
        });
    });

    describe('selectPackagesForImports', () => {
        it('returns an empty list for no imports', () => {
            assert.deepEqual(selectPackagesForImports([]), []);
        });

        it('keeps only allowlisted imports and drops unknown ones', () => {
            const result = selectPackagesForImports(['numpy', 'os', 'sys', 'pandas']);
            assert.sameMembers(result, ['numpy', 'pandas']);
        });

        it('translates aliased import names via IMPORT_TO_PACKAGE', () => {
            assert.deepEqual(selectPackagesForImports(['sklearn']), ['scikit-learn']);
        });

        it('deduplicates when an alias and its target both appear', () => {
            const result = selectPackagesForImports(['sklearn', 'scikit-learn']);
            assert.deepEqual(result, ['scikit-learn']);
        });

        it('accepts any iterable of import names (e.g. a Set)', () => {
            const result = selectPackagesForImports(new Set(['numpy', 'numpy', 'unknown']));
            assert.deepEqual(result, ['numpy']);
        });
    });
});
