import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'app-readonly-textarea',
    template: `<textarea pInputTextarea [class.textarea-resize-none]="resizeNone" [value]="value" [readonly]="true" type="text" [autoResize]="autoResize" rows="1"></textarea>`,
    styles: [`:host { display: flex; flex-direction: column; }`],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ReadonlyTextareaComponent {
    @Input() value: unknown;
    @Input() autoResize: boolean = false;
    @Input() resizeNone: boolean = false;
}
