import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

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

    constructor(
        @Inject(MAT_DIALOG_DATA)
        public data: {
            title: string;
            description: string;
            label?: string;
            options: SelectorDialogOptions[];
            multiple?: boolean;
        }
    ) {
        this.title = data?.title;
        this.description = data?.description;
        this.multiple = !!data?.multiple;
        this.options = data?.options || [];
        if (data?.label) {
            this.label = data?.label;
        }
    }

    ngOnInit(): void {}
}
