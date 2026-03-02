import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { BaseGridComponent, Filter } from '../base-grid/base-grid.component';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { ChipsModule } from 'primeng/chips';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';

@Component({
    selector: 'token-mints',
    templateUrl: './token-mints.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './token-mints.component.scss',
    ],
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
        MatButtonModule,
        TranslocoModule,
        ReactiveFormsModule,
        TableComponent,
        InputGroupModule,
        InputGroupAddonModule,
        InputTextModule,
        ChipsModule,
    ],
})
export class TokenMintsComponent extends BaseGridComponent {
    public totalAmount: number = 0;

    columns: any[] = [
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
        {
            type: ColumnType.TEXT,
            field: 'tokenName',
            title: 'grid.name',
            width: '200px',
        },
        {
            type: ColumnType.TEXT,
            field: 'tokenSymbol',
            title: 'grid.symbol',
            width: '100px',
        },
        {
            type: ColumnType.TEXT,
            field: 'tokenAmount',
            title: 'grid.token_amount',
            width: '150px',
            sort: true,
            formatValue: (value: any) => {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    return num.toLocaleString();
                }
                return value;
            },
        },
        {
            type: ColumnType.HEDERA,
            field: 'tokenId',
            title: 'grid.token_id',
            width: '200px',
            hederaType: HederaType.TOKEN,
        },
        {
            type: ColumnType.TEXT,
            field: 'policyDescription',
            title: 'grid.policy',
            width: '250px',
        },
        {
            type: ColumnType.TEXT,
            field: 'issuer',
            title: 'grid.issuer',
            width: '300px',
        },
        {
            type: ColumnType.TEXT,
            field: 'geography',
            title: 'grid.coordinates',
            width: '200px',
            formatValue: (value: any) => {
                if (typeof value === 'string') {
                    const parts = value.split(',');
                    if (parts.length === 2) {
                        return `Lat: ${parts[0]}, Lng: ${parts[1]}`;
                    }
                }
                return value;
            },
        },
        {
            type: ColumnType.BUTTON,
            title: 'grid.map',
            btn_label: 'grid.view_map',
            width: '100px',
            callback: this.onMap.bind(this),
        },
        {
            type: ColumnType.TEXT,
            field: 'mintDate',
            title: 'grid.date',
            width: '200px',
            sort: true,
            formatValue: (value: any) => {
                if (value) {
                    const date = new Date(value);
                    return date.toLocaleString();
                }
                return '';
            },
        },
    ];

    constructor(
        private entitiesService: EntitiesService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);

        this.orderField = 'consensusTimestamp';
        this.orderDir = 'desc';

        this.filters.push(
            new Filter({
                type: 'input',
                field: 'tokenId',
                label: 'grid.filter.token_id',
            }),
            new Filter({
                type: 'input',
                field: 'policyId',
                label: 'grid.filter.policy_id',
            }),
            new Filter({
                type: 'input',
                field: 'minAmount',
                label: 'grid.filter.min_amount',
            }),
            new Filter({
                type: 'input',
                field: 'maxAmount',
                label: 'grid.filter.max_amount',
            }),
            new Filter({
                type: 'input',
                field: 'geography',
                label: 'grid.filter.geography',
            }),
            new Filter({
                type: 'input',
                field: 'schemaName',
                label: 'grid.filter.schema',
            }),
            new Filter({
                type: 'input',
                field: 'startDate',
                label: 'grid.filter.start_date',
            }),
            new Filter({
                type: 'input',
                field: 'endDate',
                label: 'grid.filter.end_date',
            }),
        );
    }

    protected override getFilters(): any {
        const filters = super.getFilters();
        // When sorting by token amount, use the analytics field
        if (filters.orderField === 'tokenAmount') {
            filters.orderField = 'analytics.tokenAmount';
        }
        return filters;
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getTokenMints(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                this.totalAmount = result?.totalAmount || 0;
                setTimeout(() => {
                    this.loadingData = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingData = false;
                console.error(message);
            },
        });
    }

    protected loadFilters(): void {
        this.loadingFilters = false;
    }

    public override onOpen(element: any) {
        this.router.navigate([`/vp-documents/${element.consensusTimestamp}`]);
    }

    public onMap(element: any) {
        if (element && element.geography) {
            const url = `https://www.google.com/maps/search/?api=1&query=${element.geography}`;
            window.open(url, '_blank');
        }
    }
}
