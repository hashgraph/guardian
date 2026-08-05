import { EXPORT_ROW_CAP } from '~/composables/useApiDownload';

/**
 * Drives the "more than 1,000 records match — only the first 1,000 will
 * download" confirmation dialog shared by every table CSV button and the
 * Reports page's Export Data / Impact Summary downloads. Pair with
 * `<ExportLimitDialog>`, bound to the returned refs, in the same component.
 */
export function useExportLimit() {
    const dialogOpen = ref(false);
    const pendingTotal = ref(0);
    let resolver: ((proceed: boolean) => void) | null = null;

    /** Resolves immediately (true) when total is within the cap; otherwise opens the dialog and waits for the user's choice. */
    function confirmIfCapped(total: number): Promise<boolean> {
        if (total <= EXPORT_ROW_CAP) return Promise.resolve(true);
        pendingTotal.value = total;
        dialogOpen.value = true;
        return new Promise<boolean>((resolve) => {
            resolver = resolve;
        });
    }

    function onConfirm(): void {
        dialogOpen.value = false;
        resolver?.(true);
        resolver = null;
    }

    function onCancel(): void {
        dialogOpen.value = false;
        resolver?.(false);
        resolver = null;
    }

    return { dialogOpen, pendingTotal, confirmIfCapped, onConfirm, onCancel };
}
