import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslocoModule } from '@jsverse/transloco';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { PaginatorComponent } from '@components/paginator/paginator.component';
import { TagModule } from 'primeng/tag';
import { RouterModule } from '@angular/router';

export enum ColumnType {
    TEXT = 'text',
    BUTTON = 'button',
    CHIP = 'chip',
}

export interface BaseColumn {
    title: string;
    width?: string;
}

export interface TextColumn extends BaseColumn {
    type: ColumnType.TEXT;
    field: string;
    sort?: boolean;
    link?: {
        field: string;
        url: string;
    };
}

export interface ChipColumn extends BaseColumn {
    type: ColumnType.CHIP;
    field: string;
    sort?: boolean;
}

export interface ButtonColumn extends BaseColumn {
    type: ColumnType.BUTTON;
    callback: (row: any) => void;
    field?: string;
    btn_label: string;
}

@Component({
    selector: 'app-table',
    standalone: true,
    imports: [
        TableModule,
        PaginatorModule,
        TranslocoModule,
        ProgressSpinnerModule,
        ButtonModule,
        NgStyle,
        NgTemplateOutlet,
        PaginatorComponent,
        TagModule,
        RouterModule,
    ],
    templateUrl: './table.component.html',
    styleUrl: './table.component.scss',
})
export class TableComponent {
    @Input() columns!: TextColumn[] | ButtonColumn[] | ChipColumn[];
    @Input() data!: any[];
    @Input() pageIndex: number = 0;
    @Input() pageSize: number = 5;
    @Input() total: number = 0;
    @Input() sortColumn?: string;
    @Input() sortDirection?: string;
    @Input() loading = true;
    @Input() paginator = true;
    @Input() pageSizeOptions = [10, 25, 50, 100];

    @Output('onSort') onSortChange = new EventEmitter<any>();
    @Output('onPage') onPage = new EventEmitter<any>();

    minWidth = 0;

    ngOnChanges() {
        this.minWidth = 0;
        this.columns.forEach((column) => {
            const colWidth = parseInt(column.width || '0px', 10);
            this.minWidth += colWidth;
        });
        //this.loading = true;
    }

    onSort(column: string) {
        if (column !== this.sortColumn) {
            this.onSortChange.emit({
                active: column,
                direction: 'asc',
            });
            return;
        }
        let active = column;
        let direction;
        switch (this.sortDirection) {
            case 'asc':
                direction = 'desc';
                break;
            case 'desc':
                active = '';
                direction = '';
                break;
            default:
                direction = 'asc';
        }
        this.onSortChange.emit({
            active,
            direction,
        });
    }

    onPageChange(event: any) {
        this.onPage.emit(event);
    }

    getFieldValue(paths: string, obj: any) {
        const pathList = paths.split('.');
        let result = obj[pathList[0]];
        for (let i = 1; i < pathList.length; i++) {
            if (!result) {
                return result;
            }
            result = result[pathList[i]];
        }
        return result;
    }
}
