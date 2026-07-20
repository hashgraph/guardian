import assert from 'node:assert/strict';
import { OpenAIConnect } from '../dist/helpers/openai-helper.js';

const policy = (id, name, extra = {}) => ({
    _id: { toString: () => id },
    name,
    topicDescription: extra.topicDescription,
    detailsUrl: extra.detailsUrl,
});

const fakeChain = (answer) => ({
    async invoke() {
        return { answer };
    },
});

describe('OpenAIConnect.ask without a chain', () => {
    it('returns an empty response for a null chain', async () => {
        const result = await OpenAIConnect.ask(null, 'question', []);
        assert.deepEqual(result, { answerBefore: '', answerAfter: '', items: [] });
    });

    it('returns an empty response for an undefined chain', async () => {
        const result = await OpenAIConnect.ask(undefined, 'question', []);
        assert.deepEqual(result, { answerBefore: '', answerAfter: '', items: [] });
    });
});

describe('OpenAIConnect.ask with a chain', () => {
    it('uses the chain answer as answerBefore', async () => {
        const result = await OpenAIConnect.ask(fakeChain('Try the Verra policy'), 'q', []);
        assert.equal(result.answerBefore, 'Try the Verra policy');
    });

    it('appends the canned answerAfter disclaimer', async () => {
        const result = await OpenAIConnect.ask(fakeChain('anything'), 'q', []);
        assert.match(result.answerAfter, /Guardian methodologies/);
    });

    it('resolves methodologies for policies mentioned in the answer', async () => {
        const policies = [policy('1', 'Verra'), policy('2', 'GoldStandard')];
        const result = await OpenAIConnect.ask(fakeChain('Use Verra for this case'), 'q', policies);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].id, '1');
        assert.equal(result.items[0].label, 'Verra');
    });

    it('returns no items when no policy name matches', async () => {
        const policies = [policy('1', 'Verra')];
        const result = await OpenAIConnect.ask(fakeChain('No methodologies here'), 'q', policies);
        assert.deepEqual(result.items, []);
    });
});

describe('OpenAIConnect.getChain', () => {
    it('is a static async factory function', () => {
        assert.equal(typeof OpenAIConnect.getChain, 'function');
        assert.equal(OpenAIConnect.getChain.length, 2);
    });
});
