import {
    Directive,
    ElementRef,
    EventEmitter,
    HostBinding,
    HostListener,
    Input,
    Output,
} from '@angular/core';

export interface ElementSize {
    id: string;
    size: string;
}

export interface StopResizingEvent {
    prev: ElementSize | null;
    next: ElementSize | null;
}

@Directive({
    selector: '[resizing]',
})
export class ResizingDirective {
    @Input() resizingDisabled: boolean = false;
    @Input() vertical: boolean = false;

    isMoving: boolean = false;

    @Output() onStopResizing = new EventEmitter<StopResizingEvent>();

    private _prevElement: HTMLElement | null;
    private _currentElement: HTMLElement;
    private _nextElement: HTMLElement | null;

    constructor(private elementRef: ElementRef<HTMLElement>) {}

    ngAfterViewChecked(): void {
        this._currentElement = this.elementRef.nativeElement;
        this._prevElement = this._currentElement
            .previousElementSibling as HTMLElement | null;
        this._nextElement = this._currentElement
            .nextElementSibling as HTMLElement | null;
    }

    @HostBinding('attr.active') get getActive() {
        return this.isMoving;
    }

    @HostListener('mousedown')
    startMove() {
        document.body.classList.add('inherit-cursor');
        document.body.classList.add('pointer-events-children-none');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = this.vertical ? 'ns-resize' : 'ew-resize';

        this.isMoving = true;

        let computedStylesPrevElement = this._prevElement
            ? getComputedStyle(this._prevElement)
            : null;
        let computedStylesNextElement = this._nextElement
            ? getComputedStyle(this._nextElement)
            : null;
        let computedStylesPrevElementSizes = this._prevElement
            ? {
                  width: computedStylesPrevElement!.width,
                  height: computedStylesPrevElement!.height,
              }
            : null;
        let computedStylesNextElementSizes = this._prevElement
            ? {
                  width: computedStylesNextElement!.width,
                  height: computedStylesNextElement!.height,
              }
            : null;

        if (!this.vertical) {
            if (this._prevElement) {
                this._prevElement.style.width =
                    computedStylesPrevElementSizes!.width;
                this._prevElement.style.flexBasis =
                    this._prevElement.style.height;
            }
            if (this._nextElement) {
                this._nextElement.style.width =
                    computedStylesNextElementSizes!.width;
                this._nextElement.style.flexBasis =
                    this._nextElement.style.height;
            }
        }
        if (this.vertical) {
            if (this._prevElement) {
                this._prevElement.style.height =
                    computedStylesPrevElementSizes!.height;
                this._prevElement.style.flexBasis =
                    this._prevElement.style.height;
            }
            if (this._nextElement) {
                this._nextElement.style.height =
                    computedStylesNextElementSizes!.height;
                this._nextElement.style.flexBasis =
                    this._nextElement.style.height;
            }
        }
    }

    @HostListener('window:mouseup')
    stopMove() {
        if (!this.isMoving) {
            return;
        }

        document.body.classList.remove('inherit-cursor');
        document.body.classList.remove('pointer-events-children-none');
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        this.isMoving = false;

        let prev = this._prevElement
            ? {
                  id: this._prevElement.getAttribute('resizing-id') as string,
                  size: this.vertical
                      ? getComputedStyle(this._prevElement).height
                      : getComputedStyle(this._prevElement).width,
              }
            : null;
        let next = this._nextElement
            ? {
                  id: this._nextElement.getAttribute('resizing-id') as string,
                  size: this.vertical
                      ? getComputedStyle(this._nextElement).height
                      : getComputedStyle(this._nextElement).width,
              }
            : null;
        this.onStopResizing.emit({
            prev,
            next,
        });
    }

    @HostListener('window:mousemove', ['$event'])
    move(event: MouseEvent) {
        if (!this.isMoving) {
            return;
        }

        let computedStylesPrevElement = this._prevElement
            ? getComputedStyle(this._prevElement)
            : null;
        let computedStylesNextElement = this._nextElement
            ? getComputedStyle(this._nextElement)
            : null;
        let computedStylesPrevElementSizes = this._prevElement
            ? {
                  width: computedStylesPrevElement!.width,
                  height: computedStylesPrevElement!.height,
              }
            : null;
        let computedStylesNextElementSizes = this._prevElement
            ? {
                  width: computedStylesNextElement!.width,
                  height: computedStylesNextElement!.height,
              }
            : null;

        if (!this.vertical) {
            if (
                parseInt(computedStylesPrevElementSizes!.width) +
                    event.movementX <
                    0 ||
                parseInt(computedStylesNextElementSizes!.width) -
                    event.movementX <
                    0
            ) {
                return;
            }

            if (this._prevElement) {
                this._prevElement.style.width =
                    parseInt(computedStylesPrevElementSizes!.width) +
                    event.movementX +
                    'px';
                this._prevElement.style.flexBasis =
                    this._prevElement.style.width;
            }

            if (this._nextElement) {
                this._nextElement.style.width =
                    parseInt(computedStylesNextElementSizes!.width) -
                    event.movementX +
                    'px';
                this._nextElement.style.flexBasis =
                    this._nextElement.style.width;
            }
        }
        if (this.vertical) {
            if (
                parseInt(computedStylesPrevElementSizes!.height) +
                    event.movementY <
                    0 ||
                parseInt(computedStylesNextElementSizes!.height) -
                    event.movementY <
                    0
            ) {
                return;
            }

            if (this._prevElement) {
                this._prevElement.style.height =
                    parseInt(computedStylesPrevElementSizes!.height) +
                    event.movementY +
                    'px';
                this._prevElement.style.flexBasis =
                    this._prevElement.style.height;
            }

            if (this._nextElement) {
                this._nextElement.style.height =
                    parseInt(computedStylesNextElementSizes!.height) -
                    event.movementY +
                    'px';
                this._nextElement.style.flexBasis =
                    this._nextElement.style.height;
            }
        }
    }
}
