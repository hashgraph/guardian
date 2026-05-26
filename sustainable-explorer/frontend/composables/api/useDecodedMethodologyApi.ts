import type { NetworkId } from '~/composables/useNetwork';

export type DecodeStatus = 'success' | 'failed' | 'pending' | 'unknown';

export interface ResolvedField {
    fieldKey: string;
    title: string;
    description: string;
}

export interface FieldMapEntry {
    fieldKey: string;
    title: string;
    description: string;
    resolvedAs: string | null;
}

export interface ProjectSchema {
    schemaId: string;
    schemaName: string | null;
    schemaDescription: string | null;
    geoKey: string;
    geoFieldTitle: string | null;
    section: string | null;
    resolvedFields: {
        name: ResolvedField | null;
        country: ResolvedField | null;
        developer: ResolvedField | null;
        category: ResolvedField | null;
        scale: ResolvedField | null;
        sector: ResolvedField | null;
        vintageRaw: ResolvedField | null;
        creditingPeriod: ResolvedField | null;
        creditingPeriodStart: ResolvedField | null;
        creditingPeriodEnd: ResolvedField | null;
        sdgOrCobenefits: ResolvedField | null;
    };
    fieldMap: FieldMapEntry[];
}

export interface SchemaField {
    fieldKey: string;
    title: string;
    description: string;
    type: string;
    isGeoJson: boolean;
}

export interface SchemaSummary {
    schemaId: string;
    schemaName: string | null;
    schemaDescription: string | null;
    isProjectSchema: boolean;
    hasGeoJsonField: boolean;
    fields: SchemaField[];
}

export interface DecodedMethodologyResponse {
    policyTopicId: string;
    decodeStatus: DecodeStatus;
    decodeError: string | null;
    attempts: number;
    lastAttemptAt: string | null;
    projectSchema: ProjectSchema | null;
    availableSchemas: SchemaSummary[];
}

export interface UseDecodedMethodologyApiOptions {
    id: Ref<string>;
    network: Ref<NetworkId | string>;
}

export const useDecodedMethodologyApi = (opts: UseDecodedMethodologyApiOptions) => {
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBaseUrl as string;

    const data = ref<DecodedMethodologyResponse | null>(null);
    const pending = ref(false);
    const error = ref<Error | null>(null);
    const loaded = ref(false);

    const fetch = async () => {
        if (!import.meta.client) return;
        pending.value = true;
        error.value = null;
        try {
            data.value = await $fetch<DecodedMethodologyResponse>(
                `/api/v1/${opts.network.value}/methodologies/${opts.id.value}/decoded`,
                { baseURL },
            );
        } catch (err) {
            error.value = err instanceof Error ? err : new Error(String(err));
            data.value = null;
        } finally {
            pending.value = false;
            loaded.value = true;
        }
    };

    return { data, pending, error, loaded, fetch };
};
