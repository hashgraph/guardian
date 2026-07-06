import assert from 'node:assert/strict';
import { SwaggerPaths, SwaggerModels } from '../../dist/old-descriptions.js';

describe('old-descriptions swagger constants', () => {
    it('exports a SwaggerPaths object', () => {
        assert.equal(typeof SwaggerPaths, 'object');
        assert.ok(SwaggerPaths !== null);
    });

    it('SwaggerPaths contains known route entries', () => {
        assert.ok(Object.prototype.hasOwnProperty.call(SwaggerPaths, '/schemas'));
        assert.ok(Object.keys(SwaggerPaths).length > 0);
    });

    it('exports a SwaggerModels object', () => {
        assert.equal(typeof SwaggerModels, 'object');
        assert.ok(SwaggerModels !== null);
        assert.ok(Object.keys(SwaggerModels).length > 0);
    });

    it('SwaggerPaths route entries expose HTTP method definitions', () => {
        const schemasGet = SwaggerPaths['/schemas'];
        assert.equal(typeof schemasGet, 'object');
        assert.ok(Object.keys(schemasGet).length > 0);
    });
});
