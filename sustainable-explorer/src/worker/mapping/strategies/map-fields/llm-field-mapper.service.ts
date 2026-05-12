import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { FieldDescriptor, FieldMap, SchemaInfo, SchemaLabelMap } from '../../types';

type MappingResult = {
    fieldName: string;
    matchedIndex: string | null;
};

type SchemaLeafDescriptions = {
    descriptions: Record<string, string>;
    paths: Record<string, string>;
};

type SchemaNode = {
    key: string;
    title?: string;
    description?: string;
    children?: SchemaNode[];
};

const PROJECT_SCHEMA_LABEL = 'ProjectSchema';
const RETRY_INVALID_JSON_WITH_LLM = true;
const MAPPING_SYSTEM_PROMPT = `You are given:
1) A list of target business fields.
2) A dictionary of descriptions keyed by numeric index.

Your task is to map each target field to the single best matching description index.

Rules:
1. Match only against the provided descriptions.
2. Return the numeric index as a string in matchedIndex.
3. If no good match exists, return null.
4. Do not invent indexes.
5. Be strict and avoid weak matches.
6. Do not return same index for multiple fields unless they are identical in meaning.

Output format (STRICT JSON):
[
	{
		"fieldName": "string",
		"matchedIndex": "string | null"
	}
]`;

@Injectable()
export class LlmFieldMapperService implements IMapFieldsStrategy {
    private readonly logger = new Logger(LlmFieldMapperService.name);

    async execute(
        schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        const projectSchema = this.resolveProjectSchema(schemaMap, schemas);
        const fieldMap = this.createEmptyFieldMap(fields);

        if (!projectSchema) {
            this.logger.warn('ProjectSchema was not found, returning an empty field map.');
            return fieldMap;
        }

        const schemaDocument = this.parseSchemaDocument(projectSchema);
        if (!schemaDocument) {
            this.logger.warn(`ProjectSchema ${projectSchema.id} has no usable JSON document.`);
            return fieldMap;
        }

        const leaves = this.extractLeafNodes(this.transformSchema(schemaDocument));
        if (leaves.length === 0) {
            this.logger.warn(`ProjectSchema ${projectSchema.id} produced no leaf nodes.`);
            return fieldMap;
        }

        const leafDescriptions = this.compressLeafDescriptions(leaves);
        const userMessage = `Here is the input for matching:\n\nFields:\n${JSON.stringify(fields, null, 2)}\n\nLeaf descriptions by index:\n${JSON.stringify(leafDescriptions.descriptions, null, 2)}\n\nReturn strict JSON only following the required output format.`;

        let mappedFields: MappingResult[];
        try {
            mappedFields = await this.getMappingResponse(userMessage);
        } catch (error) {
            this.logger.error(
                `LLM mapping failed: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw new Error(`LLM mapping failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const parsedResults = mappedFields;

        for (const result of parsedResults) {
            if (!result.fieldName) {
                continue;
            }

            const matchedIndex = result.matchedIndex === null ? null : Number(result.matchedIndex);
            if (matchedIndex === null || !Number.isInteger(matchedIndex) || matchedIndex < 0 || matchedIndex >= leaves.length) {
                continue;
            }

            fieldMap[result.fieldName] = `${projectSchema.id}.${leafDescriptions.paths[String(matchedIndex)]}`;
        }

        return fieldMap;
    }

    private resolveProjectSchema(schemaMap: SchemaLabelMap, schemas: SchemaInfo[]): SchemaInfo | null {
        const schemaId = schemaMap[PROJECT_SCHEMA_LABEL];
        if (schemaId) {
            const mappedSchema = schemas.find((schema) => schema.id === schemaId);
            if (mappedSchema) {
                return mappedSchema;
            }
        }

        return schemas.find((schema) => schema.name === PROJECT_SCHEMA_LABEL) ?? null;
    }

    private createEmptyFieldMap(fields: FieldDescriptor[]): FieldMap {
        return Object.fromEntries(fields.map((field) => [field.fieldName, '']));
    }

    private parseSchemaDocument(schema: SchemaInfo): Record<string, unknown> | null {
        if (schema.document && typeof schema.document === 'object') {
            return schema.document;
        }

        if (schema.rawSchema && typeof schema.rawSchema === 'object') {
            const rawSchema = schema.rawSchema as Record<string, unknown>;
            if (rawSchema.document && typeof rawSchema.document === 'object') {
                return rawSchema.document as Record<string, unknown>;
            }

            return rawSchema;
        }

        return null;
    }

    private resolveSchemaRef(ref: string, defs: Record<string, unknown>): Record<string, unknown> | null {
        if (!ref) {
            return null;
        }

        const direct = defs[ref];
        if (direct && typeof direct === 'object') {
            return direct as Record<string, unknown>;
        }

        const match = ref.match(/#\/(?:\$defs|definitions)\/([^/]+)$/);
        if (match) {
            const resolved = defs[match[1]];
            if (resolved && typeof resolved === 'object') {
                return resolved as Record<string, unknown>;
            }
        }

        return null;
    }

    private transformSchema(schema: Record<string, unknown>): SchemaNode {
        const defs = (schema.$defs ?? schema.definitions ?? {}) as Record<string, unknown>;

        const processNode = (node: Record<string, unknown>, key = 'root'): SchemaNode => {
            const title = typeof node.title === 'string' && node.title.trim() ? node.title.trim() : key;
            const description = typeof node.description === 'string' ? node.description.trim() : '';

            const result: SchemaNode = { key };
            if (title !== key) {
                result.title = title;
            }
            if (description) {
                result.description = description;
            }

            const children: SchemaNode[] = [];
            const properties = node.properties;
            if (properties && typeof properties === 'object') {
                for (const [propKey, propValue] of Object.entries(properties as Record<string, unknown>)) {
                    if (['@context', 'type', 'id'].includes(propKey) || !propValue || typeof propValue !== 'object') {
                        continue;
                    }

                    const propNode = propValue as Record<string, unknown>;
                    const current = typeof propNode.$ref === 'string'
                        ? this.resolveSchemaRef(propNode.$ref, defs) ?? propNode
                        : propNode;

                    const childNode = processNode(current, propKey);
                    const propTitle = typeof propNode.title === 'string' && propNode.title.trim()
                        ? propNode.title.trim()
                        : childNode.key;
                    const propDesc = typeof propNode.description === 'string' && propNode.description.trim()
                        ? propNode.description.trim()
                        : childNode.description;

                    if (propTitle !== childNode.key) {
                        childNode.title = propTitle;
                    } else {
                        delete childNode.title;
                    }

                    if (propDesc) {
                        childNode.description = propDesc;
                    }

                    children.push(childNode);
                }
            }

            if (children.length > 0) {
                result.children = children;
            }

            return result;
        };

        return processNode(schema);
    }

    private extractLeafNodes(tree: SchemaNode | null): SchemaNode[] {
        const leaves: SchemaNode[] = [];

        const traverse = (node: SchemaNode, path = ''): void => {
            const children = node.children ?? [];
            if (children.length === 0) {
                leaves.push({
                    key: node.key,
                    ...(path ? { title: path } : {}),
                    ...(node.description ? { description: node.description } : {}),
                });
                return;
            }

            for (const child of children) {
                const childPath = path ? `${path}.${child.key}` : child.key;
                traverse(child, childPath);
            }
        };

        if (tree) {
            const initialPath = tree.key && tree.key !== 'root' ? tree.key : '';
            traverse(tree, initialPath);
        }

        return leaves;
    }

    private compressLeafDescriptions(leaves: SchemaNode[]): SchemaLeafDescriptions {
        const descriptions: Record<string, string> = {};
        const paths: Record<string, string> = {};

        leaves.forEach((leaf, index) => {
            descriptions[index] = leaf.description || '';
            paths[index] = leaf.title?.trim() || leaf.key;
        });

        return { descriptions, paths };
    }

    private async getMappingResponse(userMessage: string): Promise<MappingResult[]> {
        const output = await this.getModelResponse({
            systemPrompt: MAPPING_SYSTEM_PROMPT,
            userMessage,
        });

        try {
            return this.parseModelOutput(output);
        } catch (firstError) {
            if (!RETRY_INVALID_JSON_WITH_LLM) {
                throw firstError;
            }

            const jsonRetryOutput = await this.getModelResponse({
                systemPrompt: 'You convert model responses into strict JSON.',
                userMessage: this.buildJsonRetryMessage(output),
            });

            return this.parseModelOutput(jsonRetryOutput);
        }
    }

    private parseModelOutput(text: string): MappingResult[] {
        const parsed = JSON.parse(this.stripCodeFences(text)) as unknown;
        if (!Array.isArray(parsed)) {
            throw new Error('Model output is not an array.');
        }

        return parsed.map((item) => {
            const row = item as Record<string, unknown>;
            return {
                fieldName: typeof row.fieldName === 'string' ? row.fieldName : '',
                matchedIndex: typeof row.matchedIndex === 'string' || row.matchedIndex === null
                    ? (row.matchedIndex as string | null)
                    : null,
            };
        });
    }

    private buildJsonRetryMessage(modelOutput: string): string {
        return `Return strict JSON only: an array of objects with keys "fieldName" and "matchedIndex". No markdown, comments, or extra keys. Use null if no match.
Format:
[
    {
    "fieldName": "string",
    "matchedIndex": "string | null"
    }
]
Previous response:
"${modelOutput}"`;
    }

    private stripCodeFences(text: string): string {
        return text.trim().replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    private isRetryableHighDemandError(error: unknown): boolean {
        const message = error instanceof Error ? error.message : String(error ?? '');
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? (error as { status: number }).status
            : undefined;

        return status === 429 || status === 503 || message.includes('high demand') || message.includes('UNAVAILABLE');
    }

    private async generateContentWithRetry(task: () => Promise<string>, maxRetries = 3): Promise<string> {
        for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
            try {
                return await task();
            } catch (error) {
                if (!this.isRetryableHighDemandError(error) || attempt === maxRetries + 1) {
                    throw error;
                }

                this.logger.warn(`Provider error on attempt ${attempt}: ${(error as Error).message}`);
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
        }

        throw new Error('Unreachable retry state.');
    }

    private async getModelResponse({ systemPrompt, userMessage }: { systemPrompt: string; userMessage: string }): Promise<string> {
        const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

        if (!['gemini', 'openai', 'bedrock'].includes(provider)) {
            throw new Error("AI_PROVIDER must be one of 'gemini', 'openai', or 'bedrock'.");
        }

        if (provider === 'gemini') {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY environment variable is not set.');
            }

            const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
            return this.generateContentWithRetry(async () => {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
                            generationConfig: { temperature: 0 },
                        }),
                    },
                );

                const raw = await response.text();
                if (!response.ok) {
                    const error = new Error(raw || `Gemini request failed with status ${response.status}`) as Error & { status?: number };
                    error.status = response.status;
                    throw error;
                }

                const payload = JSON.parse(raw) as {
                    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                };

                return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') || '';
            });
        }

        if (provider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is not set.');
            }

            const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
            return this.generateContentWithRetry(async () => {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage },
                        ],
                        temperature: 0,
                    }),
                });

                const raw = await response.text();
                if (!response.ok) {
                    const error = new Error(raw || `OpenAI request failed with status ${response.status}`) as Error & { status?: number };
                    error.status = response.status;
                    throw error;
                }

                const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
                return payload.choices?.[0]?.message?.content || '';
            });
        }

        const bedrockRegion = process.env.AWS_BEDROCK_REGION;
        if (!bedrockRegion) {
            throw new Error('AWS_BEDROCK_REGION environment variable is not set.');
        }

        const bedrockAuthToken = process.env.AWS_BEDROCK_AUTH_TOKEN;
        if (!bedrockAuthToken) {
            throw new Error('AWS_BEDROCK_AUTH_TOKEN environment variable is not set.');
        }

        const model = process.env.AWS_BEDROCK_MODEL || 'google.gemma-3-4b-it';
        return this.generateContentWithRetry(async () => {
            const response = await fetch(
                `https://bedrock-runtime.${encodeURIComponent(bedrockRegion)}.amazonaws.com/model/${encodeURIComponent(model)}/invoke`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${bedrockAuthToken}`,
                    },
                    body: JSON.stringify({
                        system: systemPrompt,
                        messages: [
                            {
                                role: 'user',
                                content: userMessage,
                            },
                        ],
                        temperature: 0,
                    }),
                },
            );

            const raw = await response.text();
            if (!response.ok) {
                const error = new Error(raw || `Bedrock request failed with status ${response.status}`) as Error & { status?: number };
                error.status = response.status;
                throw error;
            }

            const payload = JSON.parse(raw) as {
                output?: Array<{ content?: Array<{ text?: string }> }>;
                content?: Array<{ text?: string }>;
                generation?: string;
                outputText?: string;
            
                // OpenAI-compatible shape
                choices?: Array<{
                    message?: {
                        content?: string;
                    };
                }>;
            };
            
            const outputText = payload.output?.[0]?.content
                ?.map((part) => part.text ?? '')
                .join('');
            
            const contentText = payload.content
                ?.map((part) => part.text ?? '')
                .join('');
            
            const choiceText = payload.choices?.[0]?.message?.content;
            
            return (
                outputText ||
                contentText ||
                choiceText ||
                payload.outputText ||
                payload.generation ||
                ''
            );
        });
    }
}