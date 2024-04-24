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
    selector: 'app-nfts',
    templateUrl: './nfts.component.html',
    styleUrl: './nfts.component.scss',
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
export class NftsComponent {
    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public items: any[] = [];
    public orderField: string = '';
    public orderDir: string = '';

    public displayedColumns: string[] = [
        'tokenId',
        'serialNumber',
        'metadata'
    ];

    @ViewChild(MatSort) sort!: MatSort;

    public tokenId: string = '';
    public serialNumber: string = '';
    public metadata: string = '';

    constructor(
        private logsService: LogsService,
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
        if (this.tokenId) {
            option.tokenId = this.tokenId;
        }
        if (this.serialNumber) {
            option.serialNumber = parseInt(this.serialNumber, 10);
        }

        if (this.metadata) {
            option.metadata = btoa(this.metadata);
        }
        this.logsService.getNfts(option).subscribe({
            next: (rows) => {
                if (rows) {
                    const { items, total } = rows;
                    this.items = items;
                    this.total = total;
                } else {
                    this.items = [];
                    this.total = 0;
                }
                for (const row of this.items) {
                    row.__metadata = atob(row.metadata);
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

    public onTokenId(event: any) {
        const value = (event.target.value || '').trim();
        if (this.tokenId !== value) {
            this.tokenId = value;
            this.pageIndex = 0;
            this.loadData();
        }
    }

    public onSerialNumber(event: any) {
        const value = (event.target.value || '').trim();
        if (this.serialNumber !== value) {
            this.serialNumber = value;
            this.pageIndex = 0;
            this.loadData();
        }
    }

    public onMetadata(event: any) {
        const value = (event.target.value || '').trim();
        if (this.metadata !== value) {
            this.metadata = value;
            this.pageIndex = 0;
            this.loadData();
        }
    }
}
