import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MathfieldElement } from 'mathlive';
import { matrixKeyboard } from './keyboards/matrix-keyboard';
import { mathKeyboard } from './keyboards/math-keyboard';

@Component({
    selector: 'math-live',
    templateUrl: './mathlive.component.html',
    styleUrls: ['./mathlive.component.scss']
})
export class MathLiveComponent implements OnInit, OnDestroy {
    @ViewChild('mathLiveContent', { static: true }) mathLiveContent: ElementRef;
    @Input('readonly') readonly: boolean = false;
    @Input('value') value!: string;
    @Input('keyboardContainer') keyboardContainer?: ElementRef;
    @Output('valueChange') valueChange = new EventEmitter<string>();
    @Output('keyboard') keyboard = new EventEmitter<boolean>();
    @Output('focus') focus = new EventEmitter<MathLiveComponent>();

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
        this.mfe.addEventListener("focusin", () => {
            if (this.readonly) {
                return;
            }
            if (mathVirtualKeyboard && this.keyboardContainer) {
                mathVirtualKeyboard.container = this.keyboardContainer.nativeElement;
            } else {
                mathVirtualKeyboard.container = window.document.body;
            }
            this.keyboard.emit(true);
            this.focus.emit(this);
            return mathVirtualKeyboard.show();
        });
        this.mfe.addEventListener("focusout", () => {
            if (this.readonly) {
                return;
            }

            this.keyboard.emit(false);
            this.focus.emit(this);
            return mathVirtualKeyboard.hide();
        });
        this.mfe.addEventListener('input', (ev: any) => {
            this.value = ev?.target?.value;
            this.valueChange.emit(this.value);
        });
        this.mfe.value = this.value || '';
        this.mfe.readonly = this.readonly;
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.mfe.value = this.value || '';
        this.mfe.readonly = this.readonly;
    }

    ngAfterViewInit() {
        const container = this.mathLiveContent.nativeElement;
        container.appendChild(this.mfe)
    }

    ngOnDestroy() {
        this.mfe.remove();
    }

    public getElement(): ElementRef {
        return this.mathLiveContent;
    }
}
