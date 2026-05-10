import { Injectable, Logger } from '@nestjs/common';
import { IMapFieldsStrategy } from '../../interfaces/strategies.interface';
import { FieldDescriptor, FieldMap, SchemaInfo, SchemaLabelMap } from '../../types';
import { PROJECT_EXTRACT_FIELDS, ProjectExtractField } from '../../../project-mapper/project-fields';
import { findGeoJsonDefKey, isGeoJsonProperty } from '../../../project-mapper/helpers';

// ---------------------------------------------------------------------------
// Jaro-Winkler implementation (~35 lines, no external dependency)
// ---------------------------------------------------------------------------

function jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    if (matchWindow < 0) return 0;

    const s1Matches = new Array<boolean>(s1.length).fill(false);
    const s2Matches = new Array<boolean>(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, s2.length);
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
}

function jaroWinkler(s1: string, s2: string, prefixScale = 0.1): number {
    const jaro = jaroSimilarity(s1, s2);
    if (jaro < 0.7) return jaro;

    let prefixLen = 0;
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    while (prefixLen < maxPrefix && s1[prefixLen] === s2[prefixLen]) prefixLen++;

    return jaro + prefixLen * prefixScale * (1 - jaro);
}

// ---------------------------------------------------------------------------
// Candidate type — one field from one schema
// ---------------------------------------------------------------------------

interface Candidate {
    schemaId: string;
    path: string;
    key: string;
    title: string;
    description: string;
    comment: string;
    type: string;
    isGeoJson: boolean;
}

// ---------------------------------------------------------------------------
// GeoJSON detection helper for array-of-GeoJSON pattern
// ---------------------------------------------------------------------------

function isGeoJsonPropertyExtended(
    fdef: Record<string, unknown>,
    geoDefKey: string | null,
): boolean {
    // Array-of-GeoJSON pattern: {"type":"array","items":{"$ref":"#GeoJSON"}}
    if (fdef['type'] === 'array') {
        const items = (fdef['items'] as Record<string, unknown>) ?? {};
        if (isGeoJsonProperty(items as Record<string, any>, geoDefKey)) return true;
    }
    return isGeoJsonProperty(fdef as Record<string, any>, geoDefKey);
}

// ---------------------------------------------------------------------------
// LLM fallback helpers (duplicated from LlmFieldMapperService — fine for ~50 lines)
// ---------------------------------------------------------------------------

const LLM_CROSS_SCHEMA_PROMPT = `You are given:
1) A list of unmatched target business fields with descriptions.
2) A list of candidate schema fields (schemaId, path, title, description).

Your task is to map each unmatched target field to the single best matching candidate.

Rules:
1. Match only against the provided candidates.
2. Return the candidate index as a number in matchedIndex.
3. If no good match exists, return null.
4. Do not invent indexes.

Output format (STRICT JSON):
[
  {
    "fieldName": "string",
    "matchedIndex": number | null
  }
]`;

async function callLlm(systemPrompt: string, userMessage: string): Promise<string> {
    const provider = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();

    if (provider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY ?? '';
        const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
                temperature: 0,
            }),
        });
        const raw = await response.text();
        if (!response.ok) throw Object.assign(new Error(raw), { status: response.status });
        const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
        return payload.choices?.[0]?.message?.content ?? '';
    }

    // Default: Gemini
    const apiKey = process.env.GEMINI_API_KEY ?? '';
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
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
    if (!response.ok) throw Object.assign(new Error(raw), { status: response.status });
    const payload = JSON.parse(raw) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return payload.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
}

function stripCodeFences(text: string): string {
    return text.trim().replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

/**
 * Cross-Schema Fuzzy Field Mapper
 *
 * Instead of restricting field matching to a single "ProjectSchema", this strategy
 * walks ALL schema documents and scores every field across ALL schemas against each
 * required field in PROJECT_EXTRACT_FIELDS. The best-scoring match per field wins,
 * regardless of which schema it lives in.
 *
 * Scoring (per field candidate):
 *   - Token overlap with keywords  → 60%
 *   - Jaro-Winkler(label, title)   → 40%
 *   - Exclude penalty              → ×0.2 if any exclude word appears in haystack
 *   - Geo boost                    → ×2.0 (clamped to 1.0) when field.key='geo' AND isGeoJson=true
 *   - Threshold                    → 0.3 minimum to produce a match
 */
@Injectable()
export class CrossSchemaFuzzyMapperService implements IMapFieldsStrategy {
    private readonly logger = new Logger(CrossSchemaFuzzyMapperService.name);

    async execute(
        _schemaMap: SchemaLabelMap,
        schemas: SchemaInfo[],
        fields: FieldDescriptor[],
    ): Promise<FieldMap> {
        const candidates = this.collectCandidates(schemas);

        this.logger.log(
            `Cross-schema fuzzy mapper: ${schemas.length} schema(s), ${candidates.length} total candidate(s), ${fields.length} field(s) to map`,
        );

        const fieldMap: FieldMap = {};
        const unmatched: FieldDescriptor[] = [];

        for (const field of fields) {
            const projectField = this.resolveProjectField(field.fieldName);
            const result = this.scoreBestMatch(field, projectField, candidates);

            if (result) {
                fieldMap[field.fieldName] = `${result.schemaId}.${result.path}`;
                this.logger.log(
                    `mapped "${field.fieldName}" -> ${result.schemaId}.${result.path} (score: ${result.score.toFixed(3)})`,
                );
            } else {
                unmatched.push(field);
                this.logger.debug(`no match for "${field.fieldName}" (best score below threshold)`);
            }
        }

        const matchedCount = fields.length - unmatched.length;
        this.logger.log(
            `Fuzzy mapping complete: ${matchedCount} matched, ${unmatched.length} unmatched out of ${fields.length} fields`,
        );

        if (unmatched.length > 0) {
            await this.tryLlmFallback(unmatched, candidates, fieldMap);
        }

        return fieldMap;
    }

    // ---------------------------------------------------------------------------
    // Candidate collection
    // ---------------------------------------------------------------------------

    private collectCandidates(schemas: SchemaInfo[]): Candidate[] {
        const candidates: Candidate[] = [];

        for (const schema of schemas) {
            const doc = this.resolveDocument(schema);
            if (!doc) continue;

            const geoDefKey = findGeoJsonDefKey(doc as Record<string, any>);
            const props = (doc['properties'] ?? {}) as Record<string, unknown>;

            for (const [key, propVal] of Object.entries(props)) {
                if (['@context', 'type', 'id'].includes(key)) continue;
                if (!propVal || typeof propVal !== 'object') continue;

                const def = propVal as Record<string, unknown>;
                const isGeoJson = isGeoJsonPropertyExtended(def, geoDefKey);

                candidates.push({
                    schemaId: schema.id,
                    path: key,
                    key,
                    title: typeof def['title'] === 'string' ? def['title'] : key,
                    description: typeof def['description'] === 'string' ? def['description'] : '',
                    comment: typeof def['$comment'] === 'string' ? def['$comment'] : '',
                    type: typeof def['type'] === 'string' ? def['type'] : '',
                    isGeoJson,
                });

                // One level deep
                const nestedProps = (def['properties'] ?? {}) as Record<string, unknown>;
                for (const [nestedKey, nestedVal] of Object.entries(nestedProps)) {
                    if (['@context', 'type', 'id'].includes(nestedKey)) continue;
                    if (!nestedVal || typeof nestedVal !== 'object') continue;

                    const nestedDef = nestedVal as Record<string, unknown>;
                    const nestedIsGeoJson = isGeoJsonPropertyExtended(nestedDef, geoDefKey);

                    candidates.push({
                        schemaId: schema.id,
                        path: `${key}.${nestedKey}`,
                        key: nestedKey,
                        title: typeof nestedDef['title'] === 'string' ? nestedDef['title'] : nestedKey,
                        description: typeof nestedDef['description'] === 'string' ? nestedDef['description'] : '',
                        comment: typeof nestedDef['$comment'] === 'string' ? nestedDef['$comment'] : '',
                        type: typeof nestedDef['type'] === 'string' ? nestedDef['type'] : '',
                        isGeoJson: nestedIsGeoJson,
                    });
                }
            }
        }

        return candidates;
    }

    private resolveDocument(schema: SchemaInfo): Record<string, unknown> | null {
        if (schema.document && typeof schema.document === 'object') {
            return schema.document;
        }
        if (schema.rawSchema && typeof schema.rawSchema === 'object') {
            const raw = schema.rawSchema as Record<string, unknown>;
            if (raw['document'] && typeof raw['document'] === 'object') {
                return raw['document'] as Record<string, unknown>;
            }
            return raw;
        }
        return null;
    }

    // ---------------------------------------------------------------------------
    // Scoring
    // ---------------------------------------------------------------------------

    private resolveProjectField(fieldName: string): ProjectExtractField | undefined {
        return PROJECT_EXTRACT_FIELDS.find(f => f.label === fieldName);
    }

    private scoreBestMatch(
        field: FieldDescriptor,
        projectField: ProjectExtractField | undefined,
        candidates: Candidate[],
    ): { schemaId: string; path: string; score: number } | null {
        const keywords = projectField?.keywords ?? field.keywords ?? [];
        const exclude = projectField?.exclude ?? field.exclude ?? [];
        const labelLower = field.fieldName.toLowerCase();
        const isGeoField = projectField?.key === 'geo';

        const KEYWORD_WEIGHT = 0.6;
        const JW_WEIGHT = 0.4;
        const THRESHOLD = 0.3;

        let best: { schemaId: string; path: string; score: number } | null = null;

        for (const candidate of candidates) {
            const haystack = `${candidate.title} ${candidate.description} ${candidate.key} ${candidate.comment}`.toLowerCase();

            // Token overlap (0-1)
            const matchedKeywords = keywords.filter(kw => haystack.includes(kw.toLowerCase())).length;
            const tokenScore = keywords.length > 0 ? matchedKeywords / keywords.length : 0;

            // Jaro-Winkler similarity (0-1)
            const jwScore = jaroWinkler(labelLower, candidate.title.toLowerCase());

            let score = tokenScore * KEYWORD_WEIGHT + jwScore * JW_WEIGHT;

            // Exclude penalty
            if (exclude.length > 0 && exclude.some(ex => haystack.includes(ex.toLowerCase()))) {
                score *= 0.2;
            }

            // Geo boost
            if (isGeoField && candidate.isGeoJson) {
                score = Math.min(score * 2.0, 1.0);
            }

            if (score >= THRESHOLD && (!best || score > best.score)) {
                best = { schemaId: candidate.schemaId, path: candidate.path, score };
            }
        }

        return best;
    }

    // ---------------------------------------------------------------------------
    // LLM fallback
    // ---------------------------------------------------------------------------

    private async tryLlmFallback(
        unmatched: FieldDescriptor[],
        candidates: Candidate[],
        fieldMap: FieldMap,
    ): Promise<void> {
        const hasGemini = !!process.env.GEMINI_API_KEY;
        const hasOpenAi = !!process.env.OPENAI_API_KEY;

        if (!hasGemini && !hasOpenAi) {
            this.logger.debug(
                `LLM fallback skipped: no API key configured (${unmatched.length} field(s) remain unmatched)`,
            );
            return;
        }

        this.logger.log(
            `Running LLM fallback for ${unmatched.length} unmatched field(s) across ${candidates.length} candidate(s)`,
        );

        const candidateSummary = candidates.map((c, i) => ({
            index: i,
            schemaId: c.schemaId,
            path: c.path,
            title: c.title,
            description: c.description,
        }));

        const userMessage =
            `Unmatched fields:\n${JSON.stringify(unmatched, null, 2)}\n\n` +
            `Candidates:\n${JSON.stringify(candidateSummary, null, 2)}\n\n` +
            `Return strict JSON only following the required output format.`;

        try {
            const raw = await callLlm(LLM_CROSS_SCHEMA_PROMPT, userMessage);
            const parsed = JSON.parse(stripCodeFences(raw)) as unknown;
            if (!Array.isArray(parsed)) {
                this.logger.warn('LLM fallback returned non-array response — skipping');
                return;
            }

            for (const item of parsed) {
                const row = item as Record<string, unknown>;
                const fieldName = typeof row['fieldName'] === 'string' ? row['fieldName'] : null;
                const idx = row['matchedIndex'];
                if (!fieldName) continue;
                if (idx === null || idx === undefined) continue;
                const numIdx = Number(idx);
                if (!Number.isInteger(numIdx) || numIdx < 0 || numIdx >= candidates.length) continue;

                const candidate = candidates[numIdx];
                fieldMap[fieldName] = `${candidate.schemaId}.${candidate.path}`;
                this.logger.log(
                    `LLM fallback mapped "${fieldName}" -> ${candidate.schemaId}.${candidate.path}`,
                );
            }
        } catch (error) {
            // LLM errors are non-fatal — log at warn level and proceed without the fallback
            this.logger.warn(
                `LLM fallback failed: ${error instanceof Error ? error.message : String(error)}`,
            );
        }
    }
}
