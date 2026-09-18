import assert from 'node:assert/strict';
import { ApiResponse, ApiResponseSubscribe } from '../dist/helpers/api-response.js';
import { AISuggestionService } from '../dist/helpers/suggestions.js';

const origRegister = AISuggestionService.prototype.registerListener;
const origSubscribe = AISuggestionService.prototype.subscribe;

afterEach(() => {
    AISuggestionService.prototype.registerListener = origRegister;
    AISuggestionService.prototype.subscribe = origSubscribe;
});

describe('ApiResponse', () => {
    it('registers a listener whose wrapper delegates to the handler', async () => {
        let captured = null;
        AISuggestionService.prototype.registerListener = function (event, cb) {
            captured = { event, cb };
        };
        const handler = async (msg) => ({ echoed: msg });
        ApiResponse('EVENT_A', handler);
        assert.equal(captured.event, 'EVENT_A');
        const result = await captured.cb({ payload: 1 });
        assert.deepEqual(result, { echoed: { payload: 1 } });
    });
});

describe('ApiResponseSubscribe', () => {
    it('subscribes with a wrapper that awaits the handler', async () => {
        let captured = null;
        let handled = null;
        AISuggestionService.prototype.subscribe = function (event, cb) {
            captured = { event, cb };
        };
        const handler = async (msg) => {
            handled = msg;
        };
        ApiResponseSubscribe('EVENT_B', handler);
        assert.equal(captured.event, 'EVENT_B');
        await captured.cb({ value: 2 });
        assert.deepEqual(handled, { value: 2 });
    });
});
