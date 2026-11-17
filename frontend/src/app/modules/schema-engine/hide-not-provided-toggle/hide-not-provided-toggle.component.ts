import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-hide-not-provided-toggle',
    templateUrl: './hide-not-provided-toggle.component.html',
    styleUrls: ['./hide-not-provided-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HideNotProvidedToggleComponent {
    @Input() pressed: boolean = false;
    @Output() toggled = new EventEmitter<boolean>();
}
