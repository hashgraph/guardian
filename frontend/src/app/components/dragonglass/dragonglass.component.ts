import { Component, Inject, Input, SimpleChanges } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Dialog for icon preview.
 */
@Component({
    selector: 'dragonglass',
    templateUrl: './dragonglass.component.html',
    styleUrls: ['./dragonglass.component.css']
})
export class Dragonglass {
    url:string;

    @Input('type') type!: string;
    @Input('params') params!: string;

    constructor() {
        this.url = '';
    }


    ngOnInit() {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if(this.type == 'topics') {
            this.url = `https://testnet.dragonglass.me/hedera/topics/${this.params}`;
        } else {
            this.url = '';
        }
    }
}