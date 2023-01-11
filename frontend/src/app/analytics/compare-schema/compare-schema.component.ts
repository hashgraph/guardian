import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-compare-schema',
    templateUrl: './compare-schema.component.html',
    styleUrls: ['./compare-schema.component.css']
})
export class CompareSchemaComponent implements OnInit {
    @Input('value') value!: any;

    panelOpenState = true;

    type = 'tree';

    schema1: any;
    schema2: any;
    report!: any[];
    total!: any;

    @Output() change = new EventEmitter<any>();

    displayedColumns: string[] = [];
    columns: any[] = [];

    constructor() {
    }

    ngOnInit() {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.value) {
            this.onInit();
        }
    }

    onInit() {
        this.total = this.value.total;
        this.schema1 = this.value.left;
        this.schema2 = this.value.right;
        this.report = this.value.report;
        this.columns = this.value.columns || [];
        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);
        this.onRender();
    }

    onRender() {
    }

    onApply() {
        this.change.emit({})
    }
}
