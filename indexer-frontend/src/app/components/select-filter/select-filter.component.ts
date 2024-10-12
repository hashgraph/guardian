import { Component, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { TranslocoModule } from '@jsverse/transloco';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-select-filter',
    templateUrl: './select-filter.component.html',
    styleUrl: './select-filter.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatMenuModule,
        MatCheckboxModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
        TranslocoModule
    ]
})
export class SelectFilterComponent {
    @Input('label') label?: string;
    @Input('control') control?: FormControl;
    @Input('multiple') multiple?: boolean;
    @Input('data') data?: any[];
    @Output('select') select: EventEmitter<any> = new EventEmitter<any>();

    public filtered: any[] = [];
    public count: number = 25;

    private items: any[] = [];
    private readonly size: number = 25;

    @ViewChild(MatMenuTrigger) trigger?: MatMenuTrigger;

    constructor() {
    }

    ngOnInit() {
        this.updateData();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.updateData();
    }

    private updateData() {
        const valuesMap = this.getCurrentValue();
        this.items = [];
        if (Array.isArray(this.data)) {
            for (const row of this.data) {
                if (typeof row === 'string') {
                    this.items.push({
                        label: row,
                        value: row,
                        selected: valuesMap.has(row),
                        search: row.toLowerCase()
                    })
                } else {
                    this.items.push({
                        label: row.label,
                        value: row.value,
                        selected: valuesMap.has(row.value),
                        search: (row.label || '').toLowerCase()
                    })
                }
            }
        }
        this.filtered = this.items;
        this.count = this.size;
    }

    private getCurrentValue(): Set<any> {
        const valuesMap = new Set();
        if (this.control) {
            const values = this.control.value;
            if (this.multiple) {
                if (Array.isArray(values)) {
                    for (const value of values) {
                        valuesMap.add(value);
                    }
                } else {
                    valuesMap.add(values);
                }
            } else {
                if (Array.isArray(values)) {
                    valuesMap.add(values[0]);
                } else {
                    valuesMap.add(values);
                }
            }
        }
        return valuesMap;
    }

    public onSearch($event: any) {
        if ($event.target.value) {
            const value = $event.target.value.toLowerCase();
            this.filtered = this.items.filter((item) => item.search.indexOf(value) != -1);
        } else {
            this.filtered = this.items;
        }
        this.count = this.size;
    }

    public onBackground($event: MouseEvent) {
        $event.stopPropagation();
        return false;
    }

    public onClear($event: MouseEvent) {
        for (const item of this.items) {
            item.selected = false;
        }
        if (this.control) {
            this.control.setValue(this.multiple ? [] : null);
        }
    }

    public onMore($event: MouseEvent) {
        this.count += this.size;
    }

    public onSelect(item: any) {
        if (this.multiple) {
            item.selected = !item.selected;
            const result = this.items
                .filter((item) => item.selected)
                .map((item) => item.value);
            this.control?.setValue(result);
        } else if (this.trigger) {
            for (const e of this.items) {
                e.selected = false;
            }
            item.selected = true;
            this.control?.setValue(item.value);
            this.trigger.closeMenu();
        }
    }

    public onClose($event: any) {
        if (this.multiple) {
            const result = this.items
                .filter((item) => item.selected)
                .map((item) => item.value);
            this.select.emit(result);
        } else {
            const result = this.items.find((item) => item.selected);
            this.select.emit(result?.value);
        }
    }
}
