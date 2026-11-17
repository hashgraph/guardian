export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;

export interface ViewState {
    zoom: number;
    x: number;
    y: number;
}

export function clampZoom(zoom: number, min: number = MIN_ZOOM, max: number = MAX_ZOOM): number {
    return Math.min(max, Math.max(min, zoom));
}

/**
 * Zoom so the point (px, py) – in container coordinates – stays under the same screen position.
 * Layer is positioned with left/top = (x, y) and scaled with transform-origin 0 0.
 */
export function zoomAtPoint(view: ViewState, newZoom: number, px: number, py: number): ViewState {
    const zoom = clampZoom(newZoom);
    const ratio = zoom / view.zoom;
    return {
        zoom,
        x: px - (px - view.x) * ratio,
        y: py - (py - view.y) * ratio
    };
}

/**
 * Scale (never above 1) and centre content (unscaled size) inside the container.
 */
export function fitToContainer(
    containerWidth: number,
    containerHeight: number,
    contentWidth: number,
    contentHeight: number,
    padding: number = 24
): ViewState | null {
    if (!(containerWidth > 0 && containerHeight > 0 && contentWidth > 0 && contentHeight > 0)) {
        return null;
    }
    const availableWidth = Math.max(containerWidth - padding * 2, 1);
    const availableHeight = Math.max(containerHeight - padding * 2, 1);
    const zoom = clampZoom(Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight));
    return {
        zoom,
        x: (containerWidth - contentWidth * zoom) / 2,
        y: (containerHeight - contentHeight * zoom) / 2
    };
}

/**
 * Wheel delta to zoom multiplier. Mouse notch (~100) gives about 14%, pinch deltas are small and smooth.
 */
export function wheelFactor(deltaY: number, deltaMode: number = 0): number {
    let delta = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;
    delta = Math.max(-100, Math.min(100, delta));
    return Math.exp(-delta * 0.0015);
}

/**
 * Initial view: fit when it fits at >= minZoom, otherwise minZoom with the focus point
 * (unscaled content x of the root node centre, y of its top) centred horizontally and `padding` from the top.
 */
export function initialView(
    containerWidth: number,
    containerHeight: number,
    contentWidth: number,
    contentHeight: number,
    focusX: number,
    focusY: number,
    padding: number = 24,
    minZoom: number = 0.6
): ViewState | null {
    const fit = fitToContainer(containerWidth, containerHeight, contentWidth, contentHeight, padding);
    if (!fit) {
        return null;
    }
    const zoom = Math.min(1, Math.max(fit.zoom, minZoom));
    if (zoom === fit.zoom) {
        return fit;
    }
    return {
        zoom,
        x: containerWidth / 2 - focusX * zoom,
        y: padding - focusY * zoom
    };
}
