import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

@Directive({
    standalone: false,
    selector: '[appRichTextClip]'
})
export class RichTextClipDirective implements AfterViewInit, OnDestroy {
    private _content: MutationObserver | null = null;
    private _size: ResizeObserver | null = null;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private zone: NgZone
    ) {
    }

    public ngAfterViewInit(): void {
        this.update();
        this.zone.runOutsideAngular(() => {
            const element = this.elementRef.nativeElement;
            if (typeof MutationObserver !== 'undefined') {
                this._content = new MutationObserver(() => this.update());
                this._content.observe(element, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
            if (typeof ResizeObserver !== 'undefined') {
                this._size = new ResizeObserver(() => this.update());
                this._size.observe(element);
            }
        });
    }

    public ngOnDestroy(): void {
        this._content?.disconnect();
        this._size?.disconnect();
        this._content = null;
        this._size = null;
    }

    public update(): void {
        const element = this.elementRef.nativeElement;
        element.toggleAttribute('data-clipped', element.scrollHeight > element.clientHeight + 1);
        element.toggleAttribute('data-clipped-x', element.scrollWidth > element.clientWidth + 1);
    }
}
