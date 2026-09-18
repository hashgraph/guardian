import assert from 'node:assert/strict';
import { W3SEvents } from '../dist/type/w3s-events.js';

describe('W3SEvents enum', () => {
    it('exposes the UPLOAD_FILE event with the canonical NATS subject', () => {
        assert.equal(W3SEvents.UPLOAD_FILE, 'w3s-upload-file');
    });

    it('has exactly one entry', () => {
        assert.equal(Object.keys(W3SEvents).length, 1);
    });
});
