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
    selector: 'registries',
    templateUrl: './registries.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './registries.component.scss',
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
export class RegistriesComponent extends BaseGridComponent {
    columns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '225px',
            sort: true,
        },
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.init_topic_id',
            width: '150px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
        {
            type: ColumnType.TEXT,
            field: 'owner',
            title: 'grid.account_id',
            width: '150px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.did',
            title: 'grid.did',
            width: '650px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.registrantTopicId',
            title: 'grid.registrantTopicId',
            width: '150px',
            sort: true,
            link: {
                field: 'options.registrantTopicId',
                url: '/topics',
            },
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
                label: 'grid.registrantTopicId',
                type: 'input',
                field: 'options.registrantTopicId',
            }),
            new Filter({
                label: 'grid.did',
                type: 'input',
                field: 'options.did',
            })
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getRegistries(filters).subscribe({
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

    protected loadFilters(): void {}
}
