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
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';

@Component({
    selector: 'schemas-packages',
    templateUrl: './schemas-packages.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './schemas-packages.component.scss',
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
        InputGroupAddonModule,
    ],
})
export class SchemasPackagesComponent extends BaseGridComponent {
    columns: any[] = [
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
        {
            type: ColumnType.HEDERA,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '250px',
            sort: true,
            hederaType: HederaType.TRANSACTION,
            formatValue: (value: any) => {
                if (value && value.length > 20) {
                    value = value.substr(0, 20);
                }
                return value;
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.date',
            width: '250px',
            sort: true,
            formatValue: (value: any) => {
                if (value && value.length > 20) {
                    value = value.substr(0, 20);
                }
                const fixedTimestamp = Math.floor(value * 1000);
                value = new Date(fixedTimestamp);
                const formattedDate = value.toLocaleString();
                return formattedDate;
            }
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.topic_id',
            width: '150px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'options.owner',
            title: 'grid.owner',
            width: '650px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.name',
            title: 'grid.name',
            width: '200px',
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
                type: 'input',
                field: 'topicId',
                label: 'grid.topic_id',
            })
        );
        this.filters.push(
            new Filter({
                type: 'input',
                field: 'options.owner',
                label: 'grid.owner',
            })
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getSchemasPackages(filters).subscribe({
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
        this.loadingFilters = false;
    }
}
