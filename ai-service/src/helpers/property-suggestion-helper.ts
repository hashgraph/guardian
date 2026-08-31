import { ChatOpenAI } from '@langchain/openai';
import {
    IPropertySuggestionCandidate,
    IPropertySuggestionFieldInput,
    IPropertySuggestionResult
} from '@guardian/interfaces';

const promptTemplate = `You are assisting with tagging schema fields to standardized IWA glossary properties.

Schema: {schemaTitle}

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
        schemaTitle?: string
    ): Promise<IPropertySuggestionResult[]> {
        const propertyTitles: string[] = properties.map((p) => p?.title).filter(Boolean);
        const propertyTitleSet = new Set(propertyTitles);
        const descriptionByTitle = new Map<string, string | undefined>(properties.map((p) => [p?.title, p?.description]));

        // No properties to choose from, or nothing to tag - skip the LLM call entirely.
        if (!fields?.length || !propertyTitles.length) {
            return (fields || []).map((field) => ({ fieldName: field.name, candidates: [] }));
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
                            fieldName: { type: 'string' },
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

        const prompt = promptTemplate
            .replace('{schemaTitle}', schemaTitle || 'Untitled schema')
            .replace('{properties}', propertyTitles.join(', '))
            .replace('{fields}', fieldsText);

        const structuredModel = model.withStructuredOutput(schema);
        const response: any = await structuredModel.invoke(prompt);

        const currentPropertyByField = new Map<string, string | undefined>(fields.map((field) => [field.name, field.currentProperty]));

        const resultsByField = new Map<string, IPropertySuggestionCandidate[]>();
        for (const item of (response?.results || [])) {
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

        return fields.map((field) => ({
            fieldName: field.name,
            candidates: resultsByField.get(field.name) || []
        }));
    }
}
