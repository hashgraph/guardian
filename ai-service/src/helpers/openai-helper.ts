import { OpenAI } from 'langchain/llms/openai';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { loadQAStuffChain, RetrievalQAChain } from 'langchain/chains';
import { Methodology, ResponseData } from '../models/models.js';
import { GetMehodologiesByPolicies } from './general-helper.js';
import { Policy } from '@guardian/common';

const answerAfter = 'For the most up-to-date and comprehensive information on Guardian methodologies, including any new methodologies that might have been introduced since my last update, I recommend visiting the official Guardian website or consulting the Methodologies';

export class OpenAIConnect {

    static async getChain(model: OpenAI, vector: FaissStore) {
        return new RetrievalQAChain({
            combineDocumentsChain: loadQAStuffChain(model),
            retriever: vector.asRetriever(),
            returnSourceDocuments: true,
        });

    }

    static async ask(chain: RetrievalQAChain, question: string, policies: Policy[]): Promise<ResponseData> {
        if (chain) {
            const gptResponse = await chain.call({
                query: question,
            });

            const methodologies: Methodology[] = GetMehodologiesByPolicies(gptResponse.text, policies);

            return {
                answerBefore: gptResponse.text,
                answerAfter,
                items: methodologies
            }
        }

        return {
            answerBefore: '',
            answerAfter: '',
            items: []
        };
    }
}
