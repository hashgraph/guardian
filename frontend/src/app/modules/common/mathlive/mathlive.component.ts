import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MathfieldElement, Mathfield } from 'mathlive';
import { matrixKeyboard } from './keyboards/matrix-keyboard';
import { mathKeyboard } from './keyboards/math-keyboard';

@Component({
    selector: 'math-live',
    templateUrl: './mathlive.component.html',
    styleUrls: ['./mathlive.component.scss']
})
export class MathLiveComponent implements OnInit, OnDestroy {
    @ViewChild('mathLiveContent', { static: true }) mathLiveContent: ElementRef;

    private readonly mfe: MathfieldElement;

    constructor() {
        MathfieldElement.keypressSound = null;
        MathfieldElement.plonkSound = null;
        this.mfe = new MathfieldElement();
    }

    ngOnInit(): void {
        const mathVirtualKeyboard: any = window.mathVirtualKeyboard;
        mathVirtualKeyboard.layouts = [
            mathKeyboard,
            matrixKeyboard,
            "numeric",
            "symbols",
            "greek"
        ];
        this.mfe.mathVirtualKeyboardPolicy = "manual";
        this.mfe.addEventListener("focusin", () => mathVirtualKeyboard.show());
        this.mfe.addEventListener("focusout", () => mathVirtualKeyboard.hide());

    }

    ngAfterViewInit() {
        const container = this.mathLiveContent.nativeElement;
        container.appendChild(this.mfe)
    }

    ngOnDestroy() {
        this.mfe.remove();
    }
}
