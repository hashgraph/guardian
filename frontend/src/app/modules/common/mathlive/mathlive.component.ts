import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MathfieldElement } from 'mathlive';
import { matrixKeyboard } from './keyboards/matrix-keyboard';
import { mathKeyboard } from './keyboards/math-keyboard';
import { evaluateKeyboard } from './keyboards/evaluate-keyboard';

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
    @Input('keyboardType') keyboardType!: string;
    @Input('menu') menu: boolean = false;

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
        mathVirtualKeyboard.layouts = this.createLayouts();
        this.mfe.mathVirtualKeyboardPolicy = "manual";
        this.mfe.onInlineShortcut = (_mf, s) => {
            if (/^[a-zA-Z][a-zA-Z0-9]*'?(_[a-zA-Z0-9]+'?)?$/.test(s)) {
                const m = s.match(/^([a-zA-Z]+)([0-9]+)$/);
                if (m) {
                    return `\\mathrm{${m[1]}}_{${m[2]}}`;
                }
                return `\\mathrm{${s}}`;
            }
            return '';
        };
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

    private createLayouts() {
        if (this.keyboardType === 'evaluate') {
            return [
                evaluateKeyboard,
                "numeric"
            ];
        }
        return [
            mathKeyboard,
            matrixKeyboard,
            "numeric",
            "symbols",
            "greek"
        ];
    }
}
