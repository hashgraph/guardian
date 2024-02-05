import { OpenAI } from 'langchain/llms/openai';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { loadQAStuffChain, RetrievalQAChain } from 'langchain/chains';
import { Methodology, ResponseData } from '../models/models';
import { GetMehodologiesByPolicies } from './general-helper';
import { Policy } from '../models/common/policy';

const answerAfter = 'For the most up-to-date and comprehensive information on Guardian methodologies, including any new methodologies that might have been introduced since my last update, I recommend visiting the official Guardian website or consulting the Methodologies';

export class OpenAIConnect {

    static async getChain(model: OpenAI, vector: FaissStore) {
        return new RetrievalQAChain({
            combineDocumentsChain: loadQAStuffChain(model),
            retriever: vector.asRetriever(),
            returnSourceDocuments: true,
        });

    }

    static async ask(chain: RetrievalQAChain, question: string, policies: Array<Policy>): Promise<ResponseData> {
        if (chain) {
            const gptResponse = await chain.call({
                query: question,
            });

            const methodologies: Array<Methodology> = GetMehodologiesByPolicies(gptResponse.text, policies);

            const responseData: ResponseData = {
                answerBefore: gptResponse.text,
                answerAfter: answerAfter,
                items: methodologies
            }

            return responseData;
        }

        return {
            answerBefore: '',
            answerAfter: '',
            items: []
        };
    }
}
