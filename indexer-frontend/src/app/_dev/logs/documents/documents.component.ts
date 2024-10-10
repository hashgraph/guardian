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
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { DataDialog } from '../data-dialog/data-dialog';
import { LogsService } from './../../services/logs.service';

@Component({
    selector: 'app-documents',
    templateUrl: './documents.component.html',
    styleUrl: './documents.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatPaginatorModule,
        MatTableModule,
        MatSortModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        FormsModule,
        DialogModule
    ]
})
export class DocumentsComponent {
    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public items: any[] = [];
    public orderField: string = '';
    public orderDir: string = '';

    public displayedColumns: string[] = [
        'topicId',
        'consensusTimestamp',
        'type',
        'action',
        'status',
        'options',
        'links',
        'files'
    ];

    @ViewChild(MatSort) sort!: MatSort;

    public filters: any = {
        actions: [],
        statuses: [],
        types: [],
        currentStatus: '',
        currentAction: '',
        currentType: '',
        currentTimestamp: '',
    }

    constructor(
        private logsService: LogsService,
        private dialog: Dialog
    ) {
    }

    ngAfterViewInit() {
        this.sort?.sortChange.subscribe(this.onSort.bind(this));
    }

    ngOnInit() {
        this.loading = true;
        this.loadFilters();
    }

    ngOnDestroy(): void {
    }

    private loadFilters() {
        this.loading = true;
        this.logsService.getDocumentFilters().subscribe({
            next: (filters) => {
                this.filters.actions = [];
                this.filters.statuses = [];
                this.filters.types = [];
                if (filters) {
                    if (Array.isArray(filters.actions)) {
                        for (const value of filters.actions) {
                            this.filters.actions.push({
                                value: value,
                                label: value
                            })
                        }
                    }
                    if (Array.isArray(filters.statuses)) {
                        for (const value of filters.statuses) {
                            this.filters.statuses.push({
                                value: value,
                                label: value
                            })
                        }
                    }
                    if (Array.isArray(filters.types)) {
                        for (const value of filters.types) {
                            this.filters.types.push({
                                value: value,
                                label: value
                            })
                        }
                    }
                }
                this.loadData();
            },
            error: ({ message }) => {
                this.loading = false;
                console.error(message);
            }
        });
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
        if (this.filters.currentStatus) {
            option.status = this.filters.currentStatus;
        }
        if (this.filters.currentType) {
            option.type = this.filters.currentType;
        }
        if (this.filters.currentAction) {
            option.action = this.filters.currentAction;
        }
        if (this.filters.currentTimestamp) {
            option.timestamp = this.filters.currentTimestamp;
        }
        this.logsService.getDocuments(option).subscribe({
            next: (messages) => {
                if (messages) {
                    const { items, total } = messages;
                    this.items = items;
                    this.total = total;
                } else {
                    this.items = [];
                    this.total = 0;
                }
                for (const row of this.items) {
                    row.__options = JSON.stringify(row.options);
                    row.__documents = JSON.stringify(row.documents);
                    row.__files = JSON.stringify(row.files);
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

    public onInput(event: any) {
        const value = (event.target.value || '').trim();
        let timestamp: string = '';
        if (/[0-9]{10}\.[0-9]{9}/.test(value)) {
            timestamp = value;
        }
        if (this.filters.currentTimestamp !== timestamp) {
            this.filters.currentTimestamp = timestamp;
            this.pageIndex = 0;
            this.loadData();
        }
    }

    public onDetails(text: any, isArray: boolean) {
        let data: string;
        try {
            if (isArray) {
                const a = text.map((e: any) => JSON.parse(e));
                data = JSON.stringify(a, null, 4);
            } else {
                data = JSON.stringify(text, null, 4);
            }
        } catch (error) {
            data = text;
        }
        const dialogRef = this.dialog.open<any>(DataDialog, {
            width: '1000px',
            data: { data },
        });

        dialogRef.closed.subscribe((result) => { });
    }
}
