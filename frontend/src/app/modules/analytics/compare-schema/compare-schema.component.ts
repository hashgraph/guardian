import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
    selector: 'app-compare-schema',
    templateUrl: './compare-schema.component.html',
    styleUrls: ['./compare-schema.component.css']
})
export class CompareSchemaComponent implements OnInit {
    @Input('value') value!: any;

    panelOpenState = true;

    schema1: any;
    schema2: any;
    report!: any[];
    total!: any;

    @Input() type: string = 'tree';
    @Input() idLvl: string = '1';

    @Output() change = new EventEmitter<any>();

    displayedColumns: string[] = [];
    columns: any[] = [];

    type1 = true;
    type2 = true;
    type3 = true;
    type4 = true;

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

        const fields = this.value.fields;
        this.report = fields?.report;
        this.columns = fields?.columns || [];
        this.displayedColumns = this.columns
            .filter(c => c.label)
            .map(c => c.name);

        for (let i = 0; i < this.report.length; i++) {
            const item1 = this.report[i];
            const item2 = this.report[i + 1];
            if (item1 && item2 && item2.lvl > item1.lvl) {
                item1._collapse = 1;
            } else {
                item1._collapse = 0;
            }
            item1._hidden = false;
            item1._index = i;
        }
        this.onRender();
    }

    onRender() {
    }

    onApply() {
        this.change.emit({
            type: 'params',
            idLvl: this.idLvl,
        })
    }

    onCollapse(item: any) {
        const hidden = item._collapse == 1;
        if (hidden) {
            item._collapse = 2;
        } else {
            item._collapse = 1;
        }
        for (let i = item._index + 1; i < this.report.length; i++) {
            const item2 = this.report[i];
            if (item2.lvl > item.lvl) {
                item2._hidden = hidden;
            } else {
                break;
            }
        }
    }
}
