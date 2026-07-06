import assert from 'node:assert/strict';
import { RunnableLambda } from '@langchain/core/runnables';
import { OpenAIConnect } from '../dist/helpers/openai-helper.js';

describe('OpenAIConnect.getChain', () => {
    it('assembles a retrieval chain from the model and vector store', async () => {
        const fakeModel = RunnableLambda.from(async () => 'an answer from the model');
        const fakeRetriever = RunnableLambda.from(async () => []);
        const fakeVector = { asRetriever: () => fakeRetriever };

        const chain = await OpenAIConnect.getChain(fakeModel, fakeVector);

        assert.ok(chain);
        assert.equal(typeof chain.invoke, 'function');
    });
});
