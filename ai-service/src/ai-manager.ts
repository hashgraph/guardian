import { FilesManager } from './helpers/files-manager-helper';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAIConnect } from './helpers/openai-helper';
import { VectorStorage } from './helpers/vector-storage-helper';
import { AISuggestionsDB } from './helpers/ai-suggestions-db';
import { PolicyCategory } from './models/common/policy-category';
import { Policy } from './models/common/policy';
import { PolicyDescription } from './models/models';

import * as dotenv from 'dotenv';

dotenv.config();

export class AIManager {
    versionGPT: string;
    docPath: string;
    vectorPath: string;
    policies: Array<Policy>;
    categories: Array<PolicyCategory>;
    chain: RetrievalQAChain | null;
    vector: FaissStore | null;
    model: OpenAI;
    policyDescriptions: PolicyDescription[]

    constructor() {
        this.docPath = process.env.DOCS_STORAGE_PATH || './data/generated-data';
        this.versionGPT = process.env.GPT_VERSION || 'gpt-3.5-turbo';
        this.vectorPath = process.env.VECTOR_STORAGE_PATH || './faiss-vector';
        this.categories = [];
        this.policies = [];
        this.policyDescriptions = [];
        this.model = new OpenAI({modelName: this.versionGPT, temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY});
        this.vector = null;
        this.chain = null;
    }

    async initChain() {
        this.vector = await VectorStorage.getVector(this.vectorPath);
        this.chain = await OpenAIConnect.getChain(this.model, this.vector);
    }

    async ask(question: string) {

        if (!this.vector || !this.chain) {
            await this.initChain();
        }

        const answer = await OpenAIConnect.ask(this.chain, question, this.policies);
        return answer;
    }

    async rebuildVector() {
        try {
            console.log('rebuild vector');

            this.vector = null;
            this.chain = null;

            await this.loadDBData();
            await FilesManager.generateData(this.docPath, this.policies, this.categories, this.policyDescriptions);
            await VectorStorage.create(this.docPath, this.vectorPath);

            console.log('end rebuild vector');
        } catch (e) {
            console.log(e);
        }
    }

    async loadDBData() {
        const dbRequests = new AISuggestionsDB();

        this.categories = await dbRequests.getPolicyCategories();
        console.log('fetched categories');

        this.policies = await dbRequests.getAllPolicies();
        console.log('fetched policies');

        this.policyDescriptions = await dbRequests.getFieldDescriptions(this.policies);
        console.log('fetched fields descriptions');

    }
}
