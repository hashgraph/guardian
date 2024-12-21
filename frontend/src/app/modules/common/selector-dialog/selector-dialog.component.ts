import {Component, Inject, OnInit} from '@angular/core';
import {DynamicDialogConfig, DynamicDialogRef} from 'primeng/dynamicdialog';

export interface SelectorDialogOptions {
    name: string;
    value: string;
}

@Component({
    selector: 'app-selector-dialog',
    templateUrl: './selector-dialog.component.html',
    styleUrls: ['./selector-dialog.component.css'],
})
export class SelectorDialogComponent implements OnInit {
    title!: string;
    description!: string;
    label: string = 'Choose an option';
    multiple!: boolean;
    options!: SelectorDialogOptions[];

    result: any;

    isVisible: boolean = true;

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        const data = config.data;

        this.title = data?.title;
        this.description = data?.description;
        this.multiple = !!data?.multiple;
        this.options = data?.options || [];
        if (data?.label) {
            this.label = data?.label;
        }
    }

    ngOnInit(): void {
    }

    onConfirm(): void {
        this.dialogRef.close({ok: true, result: this.result});
    }

    onCancel(): void {
        this.dialogRef.close({ok: false});
    }
}
