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
    selector: 'app-tokens',
    templateUrl: './tokens.component.html',
    styleUrl: './tokens.component.scss',
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
export class TokensComponent {
    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public items: any[] = [];
    public orderField: string = '';
    public orderDir: string = '';
    public type: string = '';
    public tokenId: string = '';
    
    public displayedColumns: string[] = [
        'tokenId',
        'name',
        'symbol',
        'type',
        'treasury',
        'status',
        'totalSupply'
    ];

    @ViewChild(MatSort) sort!: MatSort;

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
        if (this.type) {
            option.type = this.type;
        }
        if (this.tokenId) {
            option.tokenId = this.tokenId;
        }
        this.logsService.getTokens(option).subscribe({
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
                    row.__total = this.numberWithSpaces(row.totalSupply);
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

    public numberWithSpaces(value: number | string): string {
        const parts = value.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return parts.join(".");
    }

    public onInput(event: any) {
        const value = (event.target.value || '').trim();
        if (this.tokenId !== value) {
            this.tokenId = value;
            this.loadData();
        }
    }
}
