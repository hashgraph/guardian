import assert from 'node:assert/strict';
import { DocumentValidator } from '../dist/validators/rule-validator/document-validator.js';

describe('DocumentValidator constructor fallbacks', () => {
    it('uses an empty rules object when data.rules is missing', () => {
        const v = new DocumentValidator({});
        assert.equal(v.name, undefined);
        assert.equal(v.description, undefined);
        assert.equal(v.schemas.size, 0);
        assert.equal(v.relationships.size, 0);
        assert.equal(v.validators.variables.length, 0);
    });

    it('uses an empty config when rules has no config', () => {
        const v = new DocumentValidator({ rules: { name: 'R', description: 'd' } });
        assert.equal(v.name, 'R');
        assert.equal(v.description, 'd');
        assert.equal(v.validators.variables.length, 0);
        assert.equal(v.schemas.size, 0);
    });

    it('uses an empty relationships list when data.relationships is missing', () => {
        const v = new DocumentValidator({ rules: { config: { fields: [] } } });
        assert.equal(v.relationships.size, 0);
    });

    it('treats null data fields the same as missing ones', () => {
        const v = new DocumentValidator({ rules: null, relationships: null });
        assert.equal(v.relationships.size, 0);
        assert.equal(v.schemas.size, 0);
    });
});
