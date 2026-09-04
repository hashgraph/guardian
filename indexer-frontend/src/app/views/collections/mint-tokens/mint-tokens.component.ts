import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { LoadingComponent } from '@components/loading/loading.component';
import { BaseGridComponent, Filter } from '../base-grid/base-grid.component';
import { TranslocoModule } from '@jsverse/transloco';
import { SelectFilterComponent } from '@components/select-filter/select-filter.component';
import { EntitiesService } from '@services/entities.service';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ChipsModule } from 'primeng/chips';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';

@Component({
    selector: 'mint-tokens',
    templateUrl: './mint-tokens.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './mint-tokens.component.scss',
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
        LoadingComponent,
        TranslocoModule,
        ReactiveFormsModule,
        SelectFilterComponent,
        TableComponent,
        InputGroupModule,
        InputGroupAddonModule,
        ChipsModule
    ]
})
export class MintTokensComponent extends BaseGridComponent {
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
            field: 'analytics.tokenAmount',
            title: 'grid.amount',
            width: '150px',
            sort: true,
        },
        {
            type: ColumnType.TEXT,
            field: 'token.name',
            title: 'grid.token_name',
            width: '180px',
        },
        {
            type: ColumnType.TEXT,
            field: 'token.symbol',
            title: 'grid.token_symbol',
            width: '100px',
        },
        {
            type: ColumnType.TEXT,
            field: 'analytics.tokenId',
            title: 'grid.token_id',
            width: '150px',
            link: {
                field: 'analytics.tokenId',
                url: '/tokens',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'policy.name',
            title: 'grid.policy',
            width: '200px',
        },
        {
            type: ColumnType.TEXT,
            field: 'geography',
            title: 'grid.geography',
            width: '150px',
        },
        {
            type: ColumnType.CHIP,
            field: 'status',
            title: 'grid.status',
            width: '100px',
            sort: true,
        },
        {
            type: ColumnType.HEDERA,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '250px',
            sort: true,
            hederaType: HederaType.TRANSACTION,
        },
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.date',
            width: '200px',
            sort: true,
            formatValue: (value: any) => {
                const fixedTimestamp = Math.floor(value * 1000);
                return new Date(fixedTimestamp).toLocaleString();
            }
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
                label: 'grid.filter.token_id',
                type: 'input',
                field: 'analytics.tokenId',
            }),
            new Filter({
                label: 'grid.filter.policy_id',
                type: 'input',
                field: 'analytics.policyId',
            }),
            new Filter({
                label: 'grid.filter.min_amount',
                type: 'input',
                field: 'minAmount',
            }),
            new Filter({
                label: 'grid.filter.max_amount',
                type: 'input',
                field: 'maxAmount',
            }),
            new Filter({
                label: 'grid.filter.date_from',
                type: 'input',
                field: 'dateFrom',
            }),
            new Filter({
                label: 'grid.filter.date_to',
                type: 'input',
                field: 'dateTo',
            }),
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getMintTokenDocuments(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                setTimeout(() => {
                    this.loadingData = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingData = false;
                console.error(message);
            }
        });
    }

    protected loadFilters(): void {
        this.loadingFilters = true;
        this.entitiesService.getMintTokenFilters().subscribe({
            next: (result) => {
                this.setFilters(result);
                setTimeout(() => {
                    this.loadingFilters = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingFilters = false;
                console.error(message);
            }
        });
    }
}
