import { assert } from 'chai';
import { PolicyImport } from '../../dist/helpers/import-helpers/policy/policy-import.js';
import { PolicyImportExportHelper } from '../../dist/helpers/import-helpers/policy/policy-import-helper.js';

/*
 * An artifact is supplementary: a policy whose archive dropped one still imported.
 * Folding those diagnostics into `errors` makes callers that branch on
 * `errors.length` report a failure for an import that committed, so they travel
 * beside it instead.
 */
describe('@unit PolicyImport artifact errors stay out of `errors`', () => {
    const importer = (artifactErrors = []) => {
        const it = Object.create(PolicyImport.prototype);
        it.schemasResult = { errors: [] };
        it.toolsResult = { errors: [] };
        it.testsResult = { errors: [] };
        it.formulasResult = { errors: [] };
        it.artifactErrors = artifactErrors;
        return it;
    };

    const artifactError = {
        type: 'artifact',
        name: 'artifacts/orphan',
        error: 'No metadata record matches this artifact.'
    };

    it('an unresolvable artifact leaves the import result clean', async () => {
        const errors = await importer([artifactError]).getErrors();

        assert.deepEqual(errors, [],
            'errors.length is what callers branch on to decide the import failed');
    });

    it('the diagnostic is still carried, just separately', () => {
        const it = importer([artifactError]);

        assert.deepEqual(it.artifactErrors, [artifactError]);
    });

    it('a real component failure is still reported', async () => {
        const it = importer([artifactError]);
        it.schemasResult = { errors: [{ type: 'schema', name: 'S', error: 'boom' }] };
        it.toolsResult = { errors: [{ type: 'tool', name: 'T', error: 'bang' }] };

        const errors = await it.getErrors();

        assert.deepEqual(errors.map(e => e.name), ['S', 'T'],
            'the artifact entry must not join them');
    });

    it('shows why an artifact entry does not belong in that list', () => {
        // errorsMessage buckets by type, and 'artifact' matches neither branch
        const message = PolicyImportExportHelper.errorsMessage([artifactError]);

        assert.include(message, 'Failed to import components');
        assert.include(message, 'others');
    });
});
