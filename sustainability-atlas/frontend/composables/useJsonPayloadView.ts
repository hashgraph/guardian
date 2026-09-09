import type { MaybeRefOrGetter } from 'vue';

/** Stringified-JSON size at which viewers switch from syntax-highlighted rendering to a virtualized plain-text fallback, to avoid blocking the main thread on large Guardian VC/policy documents. */
export const LARGE_JSON_THRESHOLD_BYTES = 256 * 1024;

export function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function useJsonPayloadView(data: MaybeRefOrGetter<Record<string, any> | null | undefined>) {
    const jsonString = computed(() => {
        const value = toValue(data);
        if (!value) return '';
        return JSON.stringify(value, null, 2);
    });

    const sizeBytes = computed(() => jsonString.value.length);
    const isLarge = computed(() => sizeBytes.value >= LARGE_JSON_THRESHOLD_BYTES);

    // Only split into lines when actually needed by the large-payload fallback —
    // small payloads never pay this cost.
    const lines = computed(() => (isLarge.value ? jsonString.value.split('\n') : []));

    function downloadJson(filename: string): void {
        const blob = new Blob([jsonString.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return { jsonString, sizeBytes, isLarge, lines, downloadJson };
}
