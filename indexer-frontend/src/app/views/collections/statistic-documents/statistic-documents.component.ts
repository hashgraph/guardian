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
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { ChipsModule } from 'primeng/chips';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';

@Component({
    selector: 'statistic-documents',
    templateUrl: './statistic-documents.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './statistic-documents.component.scss',
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
        InputGroupModule,
        InputGroupAddonModule,
        InputTextModule,
        ReactiveFormsModule,
        ChipsModule,
    ],
})
export class StatisticDocumentsComponent extends BaseGridComponent {
    columns: any[] = [
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
        // {
        //     type: ColumnType.TEXT,
        //     field: 'analytics.schemaName',
        //     title: 'grid.schema',
        //     width: '350px',
        // },
        {
            type: ColumnType.CHIP,
            field: 'status',
            title: 'grid.status',
            width: '250px',
            sort: true,
        },
        {
            type: ColumnType.HEDERA,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '450px',
            sort: true,
            hederaType: HederaType.TRANSACTION,
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.topic_id',
            width: '300px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.date',
            width: '300px',
            sort: true,
            formatValue: (value: any) => {
                const fixedTimestamp = Math.floor(value * 1000);
                value = new Date(fixedTimestamp);
                const formattedDate = value.toLocaleString();
                return formattedDate;
            }
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
                field: 'options.issuer',
                label: 'grid.issuer',
            }),
            new Filter({
                type: 'input',
                field: 'analytics.policyId',
                label: 'grid.filter.policy_id',
            }),
            new Filter({
                type: 'input',
                field: 'analytics.schemaId',
                label: 'grid.filter.schema_id',
            }),
            new Filter({
                type: 'input',
                field: 'options.relationships',
                label: 'grid.filter.relationship',
            })
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getStatisticDocuments(filters).subscribe({
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
}
