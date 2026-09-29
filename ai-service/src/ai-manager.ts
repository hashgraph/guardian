import { FilesManager } from './helpers/files-manager-helper.js';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIConnect } from './helpers/openai-helper.js';
import { VectorStorage } from './helpers/vector-storage-helper.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { PropertySuggestionConnect } from './helpers/property-suggestion-helper.js';
import { PolicyDescription } from './models/models.js';
import * as dotenv from 'dotenv';
import { PinoLogger, Policy, PolicyCategory } from '@guardian/common';
import {
    IPropertySuggestionFieldInput,
    IPropertySuggestionRequest,
    IPropertySuggestionResponse,
    Schema,
} from '@guardian/interfaces';

dotenv.config();

export class AIManager {
    versionGPT: string;
    docPath: string;
    vectorPath: string;
    policies: Policy[];
    categories: PolicyCategory[];
    chain: any;
    vector: FaissStore | null;
    model: ChatOpenAI;
    private readonly modelConfig: any;
    policyDescriptions: PolicyDescription[];

    constructor(private readonly logger: PinoLogger) {
        this.docPath = process.env.DOCS_STORAGE_PATH || './data/generated-data';
        this.versionGPT = process.env.GPT_VERSION || 'gpt-5-nano';
        this.vectorPath = process.env.VECTOR_STORAGE_PATH || './faiss-vector';
        this.categories = [];
        this.policies = [];
        this.policyDescriptions = [];
        // Langchain forces the check on the API key format before calling the LLM server's endpoint, so
        // we need to set something "realistic" regardless if the sever actually ask for credentials
        // (i.e. usually not present for local LLMs).
        const openAIApiKey = process.env.OPENAI_API_KEY || '1234567890';

        // LLM_MODEL is defined by an optional configuration by docker compose (the model runner
        // injects it) and takes precedence over GPT_VERSION; when it is not set we fall back to
        // versionGPT (GPT_VERSION, default 'gpt-5-nano') instead of nothing, because an undefined
        // model name makes @langchain/openai silently use its own 'gpt-3.5-turbo' default.
        const modelName = process.env.LLM_MODEL || this.versionGPT;

        // Models that don't support temperature parameter. Decided from the model that is
        // actually sent: a model configured through LLM_MODEL (e.g. a local gemma) must not be
        // judged on GPT_VERSION, or it would never get temperature: 0 - and the reverse would
        // send temperature to a model that rejects it.
        const noTemperatureModels = ['o1', 'o3', 'o4', 'gpt-5'];
        const supportsTemperature = !noTemperatureModels.some((model) =>
            modelName.toLowerCase().startsWith(model),
        );

        this.logger.info('process.env.LLM_MODEL:' + process.env.LLM_MODEL, [
            'AI_SERVICE',
        ]);
        this.logger.info('process.env.LLM_URL:' + process.env.LLM_URL, [
            'AI_SERVICE',
        ]);
        this.logger.info('process.env.GPT_VERSION:' + process.env.GPT_VERSION, [
            'AI_SERVICE',
        ]);
        this.logger.info(
            'process.env.OPENAI_API_BASE:' + process.env.OPENAI_API_BASE,
            ['AI_SERVICE'],
        );

        // LLM_URL (docker compose, optional) takes precedence over OPENAI_API_BASE. It usually
        // looks like http://model-runner.docker.internal/v1/ ; the trailing slash is dropped
        // when present so the base URL never ends with one, but a URL without it is left untouched.
        const llmServiceAPIUrl = process.env.LLM_URL
            ? process.env.LLM_URL.replace(/\/+$/, '')
            : process.env.OPENAI_API_BASE;

        // Configure model with or without temperature based on model support
        // The effective values, so a container log shows what is really sent.
        this.logger.info(
            `resolved model:"${modelName}" temperature:${supportsTemperature ? 0 : 'not set'} baseUrl:"${llmServiceAPIUrl}"`,
            ['AI_SERVICE'],
        );
        const modelConfig: any = {
            modelName,
            apiKey: openAIApiKey,
            configuration: { baseURL: llmServiceAPIUrl },
        };

        if (supportsTemperature) {
            modelConfig.temperature = 0;
        }

        // Kept so per-request model instances (see suggestProperties) can be
        // rebuilt from the same settings plus a client timeout.
        this.modelConfig = modelConfig;
        this.model = new ChatOpenAI(modelConfig);
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

        const answer = await OpenAIConnect.ask(
            this.chain,
            question,
            this.policies,
        );
        return answer;
    }

    /**
     * Milliseconds still available for the LLM call. The gateway gives up on the NATS
     * request after `totalTimeoutMs` and discards the reply, so the model call must not
     * be allowed to outlive the same budget or it would burn GPU time on a result the
     * UI can never display.
     */
    static remainingModelTimeoutMs(
        totalTimeoutMs: number,
        startedAt: number,
        now: number = Date.now(),
    ): number {
        return totalTimeoutMs - (now - startedAt);
    }

    async suggestProperties(
        request: IPropertySuggestionRequest,
    ): Promise<IPropertySuggestionResponse> {
        // Same variable the gateway reads for its NATS request timeout; both services
        // load the same config files, so the two deadlines stay in sync.
        const timeoutMs = Number(process.env.GLOSSARY_AI_TIMEOUT_MS) || 300_000;
        const startedAt = Date.now();
        try {
            const fieldNames = request?.fieldNames || [];
            await this.logger.info(
                `[GLOSSARY_AI] suggestProperties received: schemaId=${request?.schemaId} requestedFields=${fieldNames.length} timeoutMs=${timeoutMs}`,
                ['AI_SERVICE'],
            );
            if (!request?.schemaId || !fieldNames.length) {
                return { available: true, results: [] };
            }

            const dbRequests = new AISuggestionsDB();
            const rawSchema = await dbRequests.getSchemaById(request.schemaId);
            if (!rawSchema) {
                await this.logger.warn(
                    `[GLOSSARY_AI] schema "${request.schemaId}" not found; returning unavailable`,
                    ['AI_SERVICE'],
                );
                return { available: false, results: [] };
            }
            // Full schema
            const schema = new Schema(rawSchema);

            const allFields: IPropertySuggestionFieldInput[] = (
                schema.fields || []
            ).map((field) => ({
                name: field.name,
                title: field.title,
                description: field.description,
                type: field.type,
                currentProperty: field.property,
            }));

            const existingFieldNames = new Set(
                allFields.map((field) => field.name),
            );
            const targetFieldNames = fieldNames.filter((name) =>
                existingFieldNames.has(name),
            );
            if (!targetFieldNames.length) {
                return { available: true, results: [] };
            }

            const properties = await dbRequests.getPolicyProperties(
                schema.iwaVersion,
            );

            const modelTimeoutMs = AIManager.remainingModelTimeoutMs(
                timeoutMs,
                startedAt,
            );
            if (modelTimeoutMs <= 0) {
                await this.logger.warn(
                    `[GLOSSARY_AI] the ${timeoutMs}ms budget was already spent on DB lookups; skipping the LLM call`,
                    ['AI_SERVICE'],
                );
                return { available: false, results: [] };
            }
            // Rebuilt per request (a fresh instance, not `withConfig`, which only wraps
            // the runnable and never reaches the client):
            // - the OpenAI client is built lazily from the constructor `timeout` field,
            //   so a fresh instance is the only way to bound the in-flight HTTP call;
            //   on timeout the SDK aborts the fetch and the LLM server cancels the
            //   generation instead of finishing it;
            // - `maxRetries: 0`: the model's LangChain AsyncCaller defaults to 6
            //   retries, so a call that fails at the client level (timeout) or at the
            //   response level (model returns JSON the schema parser rejects) would
            //   otherwise be re-run up to 7 times - a full generation each, all of it
            //   spent on a result the UI can never display.
            const model = new ChatOpenAI({
                ...this.modelConfig,
                timeout: modelTimeoutMs,
                maxRetries: 0,
            });

            const results = await PropertySuggestionConnect.suggest(
                model,
                allFields,
                properties || [],
                schema.name,
                schema.description,
                targetFieldNames,
                this.logger,
            );

            await this.logger.info(
                `[GLOSSARY_AI] suggestProperties completed in ${Date.now() - startedAt}ms: ${results.length} field(s), ` +
                    `${results.reduce((sum, result) => sum + result.candidates.length, 0)} candidate(s)`,
                ['AI_SERVICE'],
            );

            return { available: true, results };
        } catch (e) {
            await this.logger.error(
                `[GLOSSARY_AI] suggestProperties failed after ${Date.now() - startedAt}ms: ${e.message}`,
                ['AI_SERVICE'],
            );
            return { available: false, results: [] };
        }
    }

    async rebuildVector() {
        try {
            await this.logger.info('rebuild vector', ['AI_SERVICE']);

            this.vector = null;
            this.chain = null;

            await this.loadDBData();
            await FilesManager.generateData(
                this.docPath,
                this.policies,
                this.categories,
                this.policyDescriptions,
                this.logger,
            );
            await VectorStorage.create(
                this.docPath,
                this.vectorPath,
                this.logger,
            );

            await this.logger.info('end rebuild vector', ['AI_SERVICE']);
        } catch (e) {
            await this.logger.error(e.message, ['AI_SERVICE']);
        }
    }

    async loadDBData() {
        const dbRequests = new AISuggestionsDB();

        this.categories = await dbRequests.getPolicyCategories();
        await this.logger.info('fetched categories', ['AI_SERVICE']);

        this.policies = await dbRequests.getAllPolicies();
        await this.logger.info('fetched policies', ['AI_SERVICE']);

        this.policyDescriptions = await dbRequests.getFieldDescriptions(
            this.policies,
        );
        await this.logger.info('fetched fields descriptions', ['AI_SERVICE']);
    }
}
