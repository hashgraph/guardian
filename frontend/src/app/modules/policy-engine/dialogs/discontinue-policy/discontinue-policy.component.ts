import { Component } from '@angular/core';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

/**
 * Discontinue policy dialog.
 */
@Component({
    selector: 'discontinue-policy',
    templateUrl: './discontinue-policy.component.html',
    styleUrls: ['./discontinue-policy.component.scss'],
})
export class DiscontinuePolicy {
    stateOptions = [
        { label: 'Deffered', value: true },
        { label: 'Immediate', value: false },
    ];
    isDiscontinuingDeffered: boolean = true;
    date: Date;
    minDate: Date = new Date().addDays(1);

    constructor(public ref: DynamicDialogRef) {}

    ngOnInit() {}

    onNoClick(): void {
        this.ref.close();
    }

    onSubmit() {
        this.ref.close({
            date: this.isDiscontinuingDeffered ? this.date : undefined,
        });
    }
}
