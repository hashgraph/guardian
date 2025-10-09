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
import { SelectFilterComponent } from '@components/select-filter/select-filter.component';
import { EntitiesService } from '@services/entities.service';
import { FiltersService } from '@services/filters.service';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ChipsModule } from 'primeng/chips';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';

@Component({
    selector: 'label-documents',
    templateUrl: './label-documents.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './label-documents.component.scss',
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
export class LabelDocumentsComponent extends BaseGridComponent {
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
            field: 'analytics.labelName',
            title: 'grid.name',
            width: '500px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.target',
            title: 'grid.target',
            width: '250px',
            link: {
                field: 'options.target',
                url: '/vp-documents',
            },
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
            field: 'analytics.tokenId',
            title: 'grid.token_id',
            width: '125px',
            link: {
                field: 'analytics.tokenId',
                url: '/tokens',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.topic_id',
            width: '125px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
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

        this.filters.push(
            new Filter({
                label: 'grid.filter.topic_id',
                type: 'input',
                field: 'topicId',
            }),
            new Filter({
                type: 'input',
                field: 'analytics.policyId',
                label: 'grid.filter.policy_id',
            }),
            new Filter({
                type: 'input',
                field: 'analytics.tokenId',
                label: 'grid.filter.token_id',
            }),
            new Filter({
                type: 'input',
                field: 'options.target',
                label: 'grid.filter.target',
            }),
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getLabelDocuments(filters).subscribe({
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
        this.filtersService.getVpFilters().subscribe({
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
