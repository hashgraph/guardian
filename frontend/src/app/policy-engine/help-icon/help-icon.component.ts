import { Component, Input } from '@angular/core';

@Component({
    selector: 'help-icon',
    templateUrl: './help-icon.component.html',
    styleUrls: ['./help-icon.component.css']
})
export class HelpIconDialog {
    @Input('text') text!: string;
}