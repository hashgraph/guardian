import { NatsService, PinoLogger } from '@guardian/common';
import { GenerateUUIDv4, IPropertySuggestionRequest, IPropertySuggestionResponse, MessageAPI } from '@guardian/interfaces';
import { Singleton } from './decorators/singleton.js';
import process from 'node:process';

/**
 * AI Suggestions service
 */
@Singleton
export class AISuggestions extends NatsService {

    /**
     * Message queue name
     */
    public messageQueueName = 'ai-suggestions';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'ai-service-' + GenerateUUIDv4();

    constructor(private readonly logger?: PinoLogger) {
        super();
    }

    /**
     * Get AI answer
     * @returns AI answer
     */
    public async getAIAnswer(question: string): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.SUGGESTIONS_GET_ANSWER, {question})) as any;

        if (!res) {
            throw new Error('Invalid AI response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }

    public async getPropertySuggestions(request: IPropertySuggestionRequest): Promise<IPropertySuggestionResponse> {
        // The model needs minutes to answer; the previous 45s made most calls time out
        // silently. Default to 5 minutes (300000 ms), override with GLOSSARY_AI_TIMEOUT_MS (ms).
        const timeoutMs = Number(process.env.GLOSSARY_AI_TIMEOUT_MS) || 300_000;
        const startedAt = Date.now();
        await this.logger?.info(
            `[GLOSSARY_AI] NATS request ${MessageAPI.SUGGESTIONS_GET_PROPERTIES}: schemaId=${request?.schemaId} ` +
            `fields=${request?.fieldNames?.length || 0} timeoutMs=${timeoutMs}`,
            ['AI_GATEWAY']
        );
        try {
            const res = await this.requestOrThrow<IPropertySuggestionResponse>(MessageAPI.SUGGESTIONS_GET_PROPERTIES, request, timeoutMs);
            await this.logger?.info(
                `[GLOSSARY_AI] NATS response after ${Date.now() - startedAt}ms: available=${res?.available} results=${res?.results?.length || 0}`,
                ['AI_GATEWAY']
            );
            return res || { available: false, results: [] };
        } catch (error: any) {
            if (error?.code === 'NO_RESPONDERS' || error?.code === 'REQUEST_TIMEOUT') {
                await this.logger?.warn(
                    `[GLOSSARY_AI] NATS ${error.code} after ${Date.now() - startedAt}ms for ${MessageAPI.SUGGESTIONS_GET_PROPERTIES}; ` +
                    `responding unavailable (the ai-service aborts its model call at the same GLOSSARY_AI_TIMEOUT_MS deadline)`,
                    ['AI_GATEWAY']
                );
                return { available: false, results: [] };
            }
            throw error;
        }
    }

    public async rebuildAIVector(): Promise<any> {
        const res = (await this.sendMessage(MessageAPI.VECTOR_REBUILD, {})) as any;

        if (!res) {
            throw new Error('Invalid vector rebuild response');
        }
        if (res.error) {
            throw new Error(res.error);
        }
        return res;
    }
}
