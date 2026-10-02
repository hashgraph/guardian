import { ChatOpenAI } from '@langchain/openai';
import {
    IPropertySuggestionCandidate,
    IPropertySuggestionFieldInput,
    IPropertySuggestionResult
} from '@guardian/interfaces';
import { PinoLogger } from '@guardian/common';

const promptTemplate = `You are assisting with tagging schema fields to standardized IWA glossary properties. Your responses always JSON only (see "example of response"). No additional text, no explanation of the reasoning.

Schema: {schemaTitle}
{schemaDescriptionLine}
All fields below are given so you can use sibling fields as context, but only return a "results" entry for these field(s), which are the ones that actually need a suggestion: {targetFieldNames}. Do not include any other field in "results".

For each field below, choose up to 3 candidate properties from the allowed list that best match the field's meaning. Rank candidates by confidence (0 to 1, most confident first). For each candidate, set reasonCode to the single strongest signal for that match:
- "name": the field's name/title most strongly suggests it
- "description": the field's description most strongly suggests it
- "type": the field's data type/usage pattern most strongly suggests it
- "current": the field is already tagged with this property and the tag looks correct
Do not write free-form explanations - reasonCode is the only justification field. If no property is a good match for a field, return an empty candidates array for it.

Allowed properties:
{properties}

Fields:
{fields}

Example of response:
{
  "results": [
    {
      "fieldName": "...",
      "candidates": [
        {
          "title": "...",
          "confidence": ...,
          "reasonCode": "..."
        },
        ...
      ]
    },
    ...
  ]
}
`;

type RationaleReasonCode = 'name' | 'description' | 'type' | 'current';

const RATIONALE_REASON_CODES: RationaleReasonCode[] = ['name', 'description', 'type', 'current'];

// A fixed, small set of sentence templates - every rationale reads the same way regardless of model phrasing.
const RATIONALE_TEMPLATES: Record<RationaleReasonCode, (fieldName: string, propertyTitle: string) => string> = {
    name: (fieldName, propertyTitle) => `The field name "${fieldName}" corresponds to ${propertyTitle}.`,
    description: (_fieldName, propertyTitle) => `The field's description matches the meaning of ${propertyTitle}.`,
    type: (_fieldName, propertyTitle) => `The field's type is consistent with how ${propertyTitle} is typically used.`,
    current: (_fieldName, propertyTitle) => `This field is already tagged as ${propertyTitle}, and that mapping looks correct.`
};

function renderRationale(reasonCode: string, fieldName: string, propertyTitle: string): string {
    const template = RATIONALE_TEMPLATES[reasonCode as RationaleReasonCode] || RATIONALE_TEMPLATES.name;
    return template(fieldName, propertyTitle);
}

export class PropertySuggestionConnect {

    static async suggest(
        model: ChatOpenAI,
        fields: IPropertySuggestionFieldInput[],
        properties: any[],
        schemaTitle?: string,
        schemaDescription?: string,
        targetFieldNames?: string[],
        logger?: PinoLogger
    ): Promise<IPropertySuggestionResult[]> {
        // Which fields we actually owe a suggestion for. `fields` stays the full schema
        // (context only, for consistency), defaulting to it here keeps the old "suggest
        // for everything passed in" behavior for any caller that doesn't pass a target list.
        const targets = targetFieldNames?.length ? targetFieldNames : (fields || []).map((field) => field.name);

        const propertyTitles: string[] = properties.map((p) => p?.title).filter(Boolean);
        const propertyTitleSet = new Set(propertyTitles);
        const descriptionByTitle = new Map<string, string | undefined>(properties.map((p) => [p?.title, p?.description]));

        // Nothing to tag, or no properties to choose from - skip the LLM call entirely.
        if (!targets.length || !fields?.length || !propertyTitles.length) {
            return targets.map((name) => ({ fieldName: name, candidates: [] }));
        }

        const schema = {
            title: 'PropertySuggestions',
            type: 'object',
            properties: {
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            fieldName: { type: 'string', enum: targets },
                            candidates: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        title: { type: 'string', enum: propertyTitles },
                                        confidence: { type: 'number' },
                                        reasonCode: { type: 'string', enum: RATIONALE_REASON_CODES }
                                    },
                                    required: ['title', 'confidence', 'reasonCode']
                                }
                            }
                        },
                        required: ['fieldName', 'candidates']
                    }
                }
            },
            required: ['results']
        };

        const fieldsText = fields
            .map((field) => {
                const parts = [`name: ${field.name}`];
                if (field.title) { parts.push(`title: ${field.title}`); }
                if (field.description) { parts.push(`description: ${field.description}`); }
                if (field.type) { parts.push(`type: ${field.type}`); }
                if (field.currentProperty) { parts.push(`currentProperty: ${field.currentProperty}`); }
                return `- ${parts.join(', ')}`;
            })
            .join('\n');

        const schemaDescriptionLine = schemaDescription ? `Schema description: ${schemaDescription}\n` : '';

        const prompt = promptTemplate
            .replace('{schemaTitle}', schemaTitle || 'Untitled schema')
            .replace('{schemaDescriptionLine}', schemaDescriptionLine)
            .replace('{targetFieldNames}', targets.join(', '))
            .replace('{properties}', propertyTitles.join(', '))
            .replace('{fields}', fieldsText);

        const structuredModel = model.withStructuredOutput(schema);

        await logger?.info(
            `[GLOSSARY_AI] LLM call: model="${model.model}" schema="${schemaTitle || 'Untitled schema'}" ` +
            `targets=[${targets.join(', ')}] properties=${propertyTitles.length} fields=${fields.length} promptChars=${prompt.length}`,
            ['AI_SERVICE']
        );
        // Full prompt in the message (multi-line on purpose) so the exact text sent
        // to the model - template plus substituted values - is inspectable in the sink.
        await logger?.debug(`[GLOSSARY_AI] prompt sent to the model:\n${prompt}`, ['AI_SERVICE']);

        const modelStartedAt = Date.now();
        let response: any;
        try {
            response = await structuredModel.invoke(prompt);
        } catch (error: any) {
            await logger?.warn(
                `[GLOSSARY_AI] LLM call failed after ${Date.now() - modelStartedAt}ms: ${error?.message}`,
                ['AI_SERVICE']
            );
            throw error;
        }
        if (response.length > 50) {
            response = response.slice(0, 47) + '...';
        }
        await logger?.info(
            `[GLOSSARY_AI] LLM response after ${Date.now() - modelStartedAt}ms: ${JSON.stringify(response)}`,
            ['AI_SERVICE']
        );

        const currentPropertyByField = new Map<string, string | undefined>(fields.map((field) => [field.name, field.currentProperty]));

        const resultsByField = new Map<string, IPropertySuggestionCandidate[]>();
        for (const item of (response?.results || [])) {
            // Gives a warning if basic checks don't pass. The output parser does not validate a plain JSON schema and,
            // in case ofwrong result, the filter below returns an empty - but successful - response.
            if (!item || !targets.includes(item.fieldName)) {
                await logger?.warn(
                    `[GLOSSARY_AI] dropping a result with a missing or non-target fieldName: ${JSON.stringify(item?.fieldName)}`,
                    ['AI_SERVICE']
                );
                continue;
            }
            // Defensive re-filter: the enum makes a hallucinated title unlikely, not impossible.
            const seenTitles = new Set<string>();
            const currentProperty = currentPropertyByField.get(item.fieldName);
            const candidates: IPropertySuggestionCandidate[] = (item?.candidates || [])
                .filter((candidate: any) => candidate && propertyTitleSet.has(candidate.title))
                .map((candidate: any) => {
                    // The model sometimes claims "current" for a candidate that isn't actually the
                    // field's current property - never let that false claim reach the rationale text.
                    const reasonCode = (candidate.reasonCode === 'current' && candidate.title !== currentProperty)
                        ? 'name'
                        : candidate.reasonCode;
                    return {
                        title: candidate.title,
                        confidence: Math.min(1, Math.max(0, Number(candidate.confidence) || 0)),
                        rationale: renderRationale(reasonCode, item.fieldName, candidate.title),
                        description: descriptionByTitle.get(candidate.title) || undefined
                    };
                })
                .sort((a: IPropertySuggestionCandidate, b: IPropertySuggestionCandidate) => b.confidence - a.confidence)
                // Same title returned twice by the model would otherwise duplicate an Angular @for track key.
                .filter((candidate: IPropertySuggestionCandidate) => {
                    if (seenTitles.has(candidate.title)) { return false; }
                    seenTitles.add(candidate.title);
                    return true;
                })
                .slice(0, 3);
            resultsByField.set(item.fieldName, candidates);
        }

        return targets.map((name) => ({
            fieldName: name,
            candidates: resultsByField.get(name) || []
        }));
    }
}
