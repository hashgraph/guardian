import { ChatOpenAI } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { createRetrievalChain } from '@langchain/classic/chains/retrieval';
import { createStuffDocumentsChain } from '@langchain/classic/chains/combine_documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Methodology, ResponseData } from '../models/models.js';
import { GetMehodologiesByPolicies } from './general-helper.js';
import { Policy } from '@guardian/common';

const answerAfter = 'For the most up-to-date and comprehensive information on Guardian methodologies, including any new methodologies that might have been introduced since my last update, I recommend visiting the official Guardian website or consulting the Methodologies';
const promptTemplate = `
Answer the question based only on the following context:

{context}

Question: {input}

Provide a short answer based on the context above.
`;

export class OpenAIConnect {

    static async getChain(model: ChatOpenAI, vector: FaissStore) {
        // Create a prompt template for question answering
        const prompt = ChatPromptTemplate.fromTemplate(promptTemplate);

        // Create the document chain
        const documentChain = await createStuffDocumentsChain({
            llm: model,
            prompt,
        });

        // Create the retrieval chain
        const retrievalChain = await createRetrievalChain({
            retriever: vector.asRetriever(),
            combineDocsChain: documentChain,
        });

        return retrievalChain;
    }

    static async ask(chain: any, question: string, policies: Policy[]): Promise<ResponseData> {
        if (chain) {
            const gptResponse = await chain.invoke({
                input: question,
            });

            const methodologies: Methodology[] = GetMehodologiesByPolicies(gptResponse.answer, policies);

            return {
                answerBefore: gptResponse.answer,
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
