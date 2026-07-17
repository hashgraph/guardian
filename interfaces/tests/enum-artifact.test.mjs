import assert from 'node:assert/strict';
import { ArtifactType } from '../dist/type/artifact.type.js';

describe('ArtifactType enum', () => {
    it('uses display strings (not the key names)', () => {
        assert.equal(ArtifactType.EXECUTABLE_CODE, 'Executable Code');
        assert.equal(ArtifactType.JSON, 'JSON');
        assert.equal(Object.keys(ArtifactType).length, 2);
    });
});
