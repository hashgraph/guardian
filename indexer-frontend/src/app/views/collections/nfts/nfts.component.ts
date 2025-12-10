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
import { LoadingComponent } from '@components/loading/loading.component';
import { BaseGridComponent, Filter } from '../base-grid/base-grid.component';
import { TranslocoModule } from '@jsverse/transloco';
import { EntitiesService } from '@services/entities.service';
import { FiltersService } from '@services/filters.service';
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';

@Component({
    selector: 'nfts',
    templateUrl: './nfts.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './nfts.component.scss',
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
        TableComponent,
        PaginatorModule,
        ChipsModule,
        ReactiveFormsModule,
        InputTextModule,
        InputGroupModule,
        InputGroupAddonModule
    ],
})
export class NFTsComponent extends BaseGridComponent {
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
            field: 'tokenId',
            title: 'grid.token_id',
            width: '300px',
            link: {
                field: 'tokenId',
                url: '/tokens',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'serialNumber',
            title: 'grid.serial_number',
            width: '250px',
        },
        {
            type: ColumnType.TEXT,
            field: 'analytics.policyId',
            title: 'grid.policy',
            width: '250px',
            link: {
                field: 'analytics.policyId',
                url: '/policies'
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'analytics.sr',
            title: 'grid.sr',
            width: '250px',
            link: {
                field: 'analytics.sr',
                url: '/registries',
                filters: {
                    'options.did': 'analytics.sr'
                }
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'metadata',
            title: 'grid.metadata',
            width: '250px',
        },
    ];

    constructor(
        private entitiesService: EntitiesService,
        private filtersService: FiltersService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);

        this.orderField = 'consensusTimestamp';
        this.orderDir = 'desc';

        this.filters.push(new Filter({
            type: 'input',
            field: 'tokenId',
            label: 'grid.token_id'
        }))
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getNFTs(filters).subscribe({
            next: (result) => {
                this.setResult(result);
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
        this.loadingFilters = true;
        this.filtersService.getVcFilters().subscribe({
            next: (result) => {
                setTimeout(() => {
                    this.loadingFilters = false;
                }, 500);
            },
            error: ({ message }) => {
                this.loadingFilters = false;
                console.error(message);
            },
        });
    }

    public override onOpen(element: any) {
        this.router.navigate([`/nfts/${element.tokenId}/${element.serialNumber}`]);
    }
}
