import { FilesManager } from './helpers/files-manager-helper.js';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { RetrievalQAChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import { OpenAIConnect } from './helpers/openai-helper.js';
import { VectorStorage } from './helpers/vector-storage-helper.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { PolicyDescription } from './models/models.js';
import * as dotenv from 'dotenv';
import { Logger, Policy, PolicyCategory } from '@guardian/common';

dotenv.config();

export class AIManager {
    versionGPT: string;
    docPath: string;
    vectorPath: string;
    policies: Policy[];
    categories: PolicyCategory[];
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
        const openAIApiKey = process.env.OPENAI_API_KEY
        if (!openAIApiKey || openAIApiKey.length < 10) {
            throw new Error('Bad openAIApiKey');
        }

        this.model = new OpenAI({modelName: this.versionGPT, temperature: 0, openAIApiKey});
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
            new Logger().info('rebuild vector', ['AI_SERVICE']);

            this.vector = null;
            this.chain = null;

            await this.loadDBData();
            await FilesManager.generateData(this.docPath, this.policies, this.categories, this.policyDescriptions);
            await VectorStorage.create(this.docPath, this.vectorPath);

            new Logger().info('end rebuild vector', ['AI_SERVICE']);
        } catch (e) {
            new Logger().error(e.message, ['AI_SERVICE']);
        }
    }

    async loadDBData() {
        const dbRequests = new AISuggestionsDB();

        this.categories = await dbRequests.getPolicyCategories();
        new Logger().info('fetched categories', ['AI_SERVICE']);

        this.policies = await dbRequests.getAllPolicies();
        new Logger().info('fetched policies', ['AI_SERVICE']);

        this.policyDescriptions = await dbRequests.getFieldDescriptions(this.policies);
        new Logger().info('fetched fields descriptions', ['AI_SERVICE']);

    }
}
