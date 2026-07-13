import assert from 'node:assert/strict';
import { RecordMethod } from '../dist/type/record.type.js';

describe('RecordMethod enum', () => {
    it('exposes Start/Stop/Action/Generate with uppercase values', () => {
        assert.equal(RecordMethod.Start, 'START');
        assert.equal(RecordMethod.Stop, 'STOP');
        assert.equal(RecordMethod.Action, 'ACTION');
        assert.equal(RecordMethod.Generate, 'GENERATE');
    });
});
