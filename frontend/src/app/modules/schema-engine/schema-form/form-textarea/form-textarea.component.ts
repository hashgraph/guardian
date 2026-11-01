import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

@Component({
    selector: 'app-form-textarea',
    template: `<textarea pInputTextarea [class.textarea-resize-none]="resizeNone" [formControl]="control" [placeholder]="placeholder" (focus)="fieldFocus.emit()" (blur)="fieldBlur.emit()" type="text" [autoResize]="autoResize" rows="1"></textarea>`,
    styles: [`:host { display: flex; flex-direction: column; } :host(.auto-grow) textarea { field-sizing: content; }`],
    standalone: false
})
export class FormTextareaComponent {
    @Input() control!: UntypedFormControl;
    @Input() placeholder: string = '';
    @Input() autoResize: boolean = false;
    @Input() resizeNone: boolean = false;
    @Output() fieldFocus = new EventEmitter<void>();
    @Output() fieldBlur = new EventEmitter<void>();
}
