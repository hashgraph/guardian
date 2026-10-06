import assert from 'node:assert/strict';
import { AISuggestions } from '../../dist/helpers/ai-suggestions.js';
import { MessageAPI } from '@guardian/interfaces';

const request = {
    schemaId: 'schema-1',
    schema: { name: 'Schema', fields: [{ name: 'fieldName' }] },
    fieldNames: ['fieldName'],
};
const originalTimeoutEnv = process.env.GLOSSARY_AI_TIMEOUT_MS;

afterEach(() => {
    if (originalTimeoutEnv === undefined) {
        delete process.env.GLOSSARY_AI_TIMEOUT_MS;
    } else {
        process.env.GLOSSARY_AI_TIMEOUT_MS = originalTimeoutEnv;
    }
});

function stubRequestOrThrow(implementation) {
    const svc = new AISuggestions();
    svc.requestOrThrow = implementation;
    return svc;
}

describe('AISuggestions.getPropertySuggestions', () => {
    it('waits five minutes for the NATS reply by default', async () => {
        delete process.env.GLOSSARY_AI_TIMEOUT_MS;
        const calls = [];
        const svc = stubRequestOrThrow(async (subject, data, timeout) => {
            calls.push({ subject, data, timeout });
            return { available: true, results: [] };
        });

        const res = await svc.getPropertySuggestions(request);

        assert.deepEqual(res, { available: true, results: [] });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].subject, MessageAPI.SUGGESTIONS_GET_PROPERTIES);
        assert.deepEqual(calls[0].data, request);
        assert.equal(calls[0].timeout, 300_000);
    });

    it('uses GLOSSARY_AI_TIMEOUT_MS when the variable is set', async () => {
        // A value that differs from the default, so the assertion can only pass
        // when the variable is actually honoured (Number() rejects underscores).
        process.env.GLOSSARY_AI_TIMEOUT_MS = '120000';
        const calls = [];
        const svc = stubRequestOrThrow(async (subject, data, timeout) => {
            calls.push(timeout);
            return { available: true, results: [] };
        });

        await svc.getPropertySuggestions(request);

        assert.deepEqual(calls, [120_000]);
    });

    it('falls back to the five-minute default for a non-numeric GLOSSARY_AI_TIMEOUT_MS', async () => {
        process.env.GLOSSARY_AI_TIMEOUT_MS = 'soon';
        const calls = [];
        const svc = stubRequestOrThrow(async (subject, data, timeout) => {
            calls.push(timeout);
            return { available: true, results: [] };
        });

        await svc.getPropertySuggestions(request);

        assert.deepEqual(calls, [300_000]);
    });

    it('returns an unavailable response when the request times out', async () => {
        const error = new Error('Timeout for "SUGGESTIONS_GET_PROPERTIES"');
        error.code = 'REQUEST_TIMEOUT';
        const svc = stubRequestOrThrow(async () => { throw error; });

        const res = await svc.getPropertySuggestions(request);

        assert.deepEqual(res, { available: false, results: [] });
    });

    it('returns an unavailable response when no responder is available', async () => {
        const error = new Error('No responders for "SUGGESTIONS_GET_PROPERTIES"');
        error.code = 'NO_RESPONDERS';
        const svc = stubRequestOrThrow(async () => { throw error; });

        const res = await svc.getPropertySuggestions(request);

        assert.deepEqual(res, { available: false, results: [] });
    });

    it('forwards a request with no schemaId (unsaved schema) unchanged, using the live schema state', async () => {
        const liveRequest = {
            schema: { name: 'Unsaved schema', fields: [{ name: 'fieldName' }] },
            fieldNames: ['fieldName'],
        };
        const calls = [];
        const svc = stubRequestOrThrow(async (subject, data, timeout) => {
            calls.push({ subject, data, timeout });
            return { available: true, results: [{ fieldName: 'fieldName', candidates: [] }] };
        });

        const res = await svc.getPropertySuggestions(liveRequest);

        assert.deepEqual(res, { available: true, results: [{ fieldName: 'fieldName', candidates: [] }] });
        assert.deepEqual(calls[0].data, liveRequest);
        assert.equal(calls[0].data.schemaId, undefined);
    });

    it('rethrows unexpected errors', async () => {
        const svc = stubRequestOrThrow(async () => { throw new Error('boom'); });

        await assert.rejects(svc.getPropertySuggestions(request), /boom/);
    });

    // The logger is assigned on the instance (not through the constructor) because the
    // Singleton decorator returns the first created instance no matter the arguments.
    function recordingLogger(entries) {
        return {
            info: async (message) => entries.push(['info', message]),
            warn: async (message) => entries.push(['warn', message]),
            error: async (message) => entries.push(['error', message]),
        };
    }

    it('logs the outgoing request and response when a logger is attached', async () => {
        delete process.env.GLOSSARY_AI_TIMEOUT_MS;
        const entries = [];
        const svc = new AISuggestions();
        svc.logger = recordingLogger(entries);
        svc.requestOrThrow = async () => ({ available: true, results: [] });

        await svc.getPropertySuggestions(request);

        assert.ok(entries.some(([level, message]) => level === 'info' && message.includes('SUGGESTIONS_GET_PROPERTIES') && message.includes('schemaId=schema-1')));
        assert.ok(entries.some(([level, message]) => level === 'info' && message.includes('NATS response')));
        svc.logger = undefined;
    });

    it('logs a warning naming the NATS error code on timeout', async () => {
        const entries = [];
        const svc = new AISuggestions();
        svc.logger = recordingLogger(entries);
        const error = new Error('Timeout exceed (SUGGESTIONS_GET_PROPERTIES)');
        error.code = 'REQUEST_TIMEOUT';
        svc.requestOrThrow = async () => { throw error; }

        const res = await svc.getPropertySuggestions(request);

        assert.deepEqual(res, { available: false, results: [] });
        assert.ok(entries.some(([level, message]) => level === 'warn' && message.includes('REQUEST_TIMEOUT')));
        svc.logger = undefined;
    });
});
