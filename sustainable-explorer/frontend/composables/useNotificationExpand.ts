/**
 * Single-open-accordion expand state for NotificationPanel.vue's list.
 *
 * Expanding a still-unread row fires `onFirstExpand` exactly once (not on
 * every click, not on collapse, not on an already-read row) — that's the
 * mark-read-on-expand hook the caller wires to `markRead`.
 */
export function useNotificationExpand(onFirstExpand: (id: string) => void) {
    const expandedId = ref<string | null>(null);

    function toggle(item: { id: string; isRead: boolean }): void {
        const opening = expandedId.value !== item.id;
        expandedId.value = opening ? item.id : null;
        if (opening && !item.isRead) onFirstExpand(item.id);
    }

    function isExpanded(id: string): boolean {
        return expandedId.value === id;
    }

    return { expandedId, toggle, isExpanded };
}
