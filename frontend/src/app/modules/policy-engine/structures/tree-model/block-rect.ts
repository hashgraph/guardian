
export class BlockRect {
    public readonly top: { x: number; y: number; };
    public readonly right: { x: number; y: number; };
    public readonly bottom: { x: number; y: number; };

    constructor(rect: DOMRect, container?: DOMRect) {
        let top = rect.top;
        let left = rect.left;
        if (container) {
            top = top - container.top;
            left = left - container.left;
        }
        this.top = { x: left + (75), y: top };
        this.bottom = { x: left + (75), y: top + rect.height };
        this.right = { x: left + rect.width, y: top + (rect.height / 2) };
    }
}
