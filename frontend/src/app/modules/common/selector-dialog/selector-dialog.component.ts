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
    public title!: string;
    public description!: string;
    public multiple!: boolean;
    public options!: SelectorDialogOptions[];

    public result: any;

    constructor(
        @Inject(MAT_DIALOG_DATA)
        public data: {
            title: string;
            description: string;
            options: SelectorDialogOptions[];
            multiple?: boolean;
        }
    ) {
        this.title = data?.title;
        this.description = data?.description;
        this.multiple = !!data?.multiple;
        this.options = data?.options || [];
    }

    ngOnInit(): void {}
}
