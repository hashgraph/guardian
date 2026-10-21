function overflowsAncestor(element: HTMLElement): boolean {
    const elementRect = element.getBoundingClientRect();
    let parent = element.parentElement;
    while (parent) {
        const style = getComputedStyle(parent);
        const clipsContent = style.overflowX === 'hidden' ||
            style.overflowX === 'clip' ||
            style.overflow === 'hidden' ||
            style.overflow === 'clip';
        if (clipsContent) {
            const parentRect = parent.getBoundingClientRect();
            if (elementRect.right > parentRect.right + 1 ||
                elementRect.left < parentRect.left - 1) {
                return true;
            }
        }
        parent = parent.parentElement;
    }
    return false;
}

/**
 * Sets the native tooltip of the hovered element only when its text is clipped.
 */
export function updateOverflowTitle(event: MouseEvent, text: string): void {
    const element = event.currentTarget;
    if (!(element instanceof HTMLElement)) { return; }
    if (element.scrollWidth > element.clientWidth || overflowsAncestor(element)) {
        element.setAttribute('title', text);
    } else {
        element.removeAttribute('title');
    }
}
