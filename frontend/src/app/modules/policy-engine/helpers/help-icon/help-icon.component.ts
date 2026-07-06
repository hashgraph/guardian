import { Component, Input } from '@angular/core';

/**
 * Help Icon
 */
@Component({
    selector: 'help-icon',
    templateUrl: './help-icon.component.html',
    styleUrls: ['./help-icon.component.scss'],
    standalone: false
})
export class HelpIcon {
    @Input('text') text!: string;
}