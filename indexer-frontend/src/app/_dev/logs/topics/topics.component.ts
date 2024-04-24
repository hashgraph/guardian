import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LogsService } from './../../services/logs.service';

@Component({
    selector: 'app-topics',
    templateUrl: './topics.component.html',
    styleUrl: './topics.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatPaginatorModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        FormsModule
    ]
})
export class TopicsComponent {
    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public items: any[] = [];
    public orderField: string = '';
    public orderDir: string = '';

    public displayedColumns: string[] = [
        'topicId',
        'messages'
    ];

    @ViewChild(MatSort) sort!: MatSort;

    public status: string = '';
    public type: string = '';

    constructor(
        private documentsService: LogsService,
    ) {
    }

    ngAfterViewInit() {
        this.sort?.sortChange.subscribe(this.onSort.bind(this));
    }

    ngOnInit() {
        this.loading = true;
        this.loadData();
    }

    ngOnDestroy(): void {
    }

    private loadData() {
        this.loading = true;

        const option: any = {
            pageIndex: this.pageIndex,
            pageSize: this.pageSize,
        };
        if (this.orderDir) {
            option.orderDir = this.orderDir.toUpperCase();
            option.orderField = this.orderField;
        }
        if (this.status) {
            option.status = this.status;
        }
        if (this.type) {
            option.type = this.type;
        }
        this.documentsService.getTopics(option).subscribe({
            next: (rows) => {
                if (rows) {
                    const { items, total } = rows;
                    this.items = items;
                    this.total = total;
                } else {
                    this.items = [];
                    this.total = 0;
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        });
    }

    public onPage(pageEvent: PageEvent) {
        this.pageIndex = pageEvent.pageIndex;
        this.pageSize = pageEvent.pageSize;
        this.loadData();
    }

    public onSort(sortEvent: Sort) {
        this.orderField = sortEvent.active;
        this.orderDir = sortEvent.direction
        this.loadData();
    }

    public onFilter() {
        this.loadData();
    }
}
