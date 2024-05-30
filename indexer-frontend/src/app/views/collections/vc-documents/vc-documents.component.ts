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

@Component({
    selector: 'vc-documents',
    templateUrl: './vc-documents.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './vc-documents.component.scss',
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
export class VcDocumentsComponent extends BaseGridComponent {
    columns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '250px',
            sort: true,
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
            type: ColumnType.CHIP,
            field: 'status',
            title: 'grid.status',
            width: '100px',
            sort: true,
        },
        {
            type: ColumnType.TEXT,
            field: 'analytics.schemaName',
            title: 'grid.schema',
            width: '200px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.issuer',
            title: 'grid.issuer',
            width: '650px',
        },
        {
            type: ColumnType.BUTTON,
            title: 'grid.open',
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
    ];

    constructor(
        private entitiesService: EntitiesService,
        private filtersService: FiltersService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);
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
        this.entitiesService.getVcDocuments(filters).subscribe({
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
