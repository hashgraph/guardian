import { clampZoom, fitToContainer, initialView, wheelFactor, zoomAtPoint } from './tree-zoom';

describe('tree-zoom', () => {
    it('keeps the point under the cursor fixed', () => {
        const view = { zoom: 1, x: 30, y: 40 };
        const next = zoomAtPoint(view, 2, 200, 100);
        expect(200 + (30 - 200) * 2).toBe(next.x);
        const worldX = (200 - view.x) / view.zoom;
        expect(next.x + worldX * next.zoom).toBeCloseTo(200);
        const worldY = (100 - view.y) / view.zoom;
        expect(next.y + worldY * next.zoom).toBeCloseTo(100);
    });

    it('clamps zoom', () => {
        expect(clampZoom(10)).toBe(3);
        expect(clampZoom(0.001)).toBe(0.1);
        expect(zoomAtPoint({ zoom: 1, x: 0, y: 0 }, 50, 0, 0).zoom).toBe(3);
    });

    it('fits and centres, never above 100%', () => {
        const small = fitToContainer(1000, 800, 200, 100, 24);
        expect(small!.zoom).toBe(1);
        expect(small!.x).toBe(400);
        expect(small!.y).toBe(350);
        const big = fitToContainer(1000, 800, 2000, 400, 24);
        expect(big!.zoom).toBeCloseTo(952 / 2000);
        expect(big!.x).toBeCloseTo(24);
    });

    it('returns null for zero sizes', () => {
        expect(fitToContainer(0, 800, 200, 100)).toBeNull();
        expect(fitToContainer(800, 800, 0, 100)).toBeNull();
    });

    it('wheel factor is direction-aware and bounded', () => {
        expect(wheelFactor(-100)).toBeGreaterThan(1.1);
        expect(wheelFactor(-100)).toBeLessThan(1.2);
        expect(wheelFactor(100)).toBeLessThan(1);
        expect(wheelFactor(-5000)).toBeCloseTo(wheelFactor(-100));
        expect(wheelFactor(-2)).toBeCloseTo(1.003, 2);
    });

    it('initial view fits when possible, otherwise 60% centred on the root', () => {
        expect(initialView(1000, 800, 200, 100, 100, 0)!.zoom).toBe(1);
        expect(initialView(1000, 800, 1000, 400, 500, 0)!.zoom).toBeCloseTo(0.952);
        const v = initialView(1000, 800, 4000, 400, 300, 10)!;
        expect(v.zoom).toBe(0.6);
        expect(v.x + 300 * 0.6).toBeCloseTo(500);
        expect(v.y + 10 * 0.6).toBeCloseTo(24);
    });
});
