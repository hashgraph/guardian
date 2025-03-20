import { ChangeDetectorRef, Component } from '@angular/core';
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
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { LandingService } from '@services/landing.service';
import { Registry } from '@indexer/interfaces';

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

    priorityChecked: string[] = [];
    alreadyExistPriorities: string[] = [];

    columns: any[] = [
        {
            type: ColumnType.CHECK_BOX,
            title: 'grid.prioritize',
            checkField: 'options.registrantTopicId',
            checkGroup: this.priorityChecked,
            width: '108px',
            disabled: (item: any) => this.alreadyExistPriorities.find(value => value == item.options.registrantTopicId),
            callback: this.onPrioritizeCheck.bind(this),
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
            width: '250px',
            sort: true,
            formatValue: (value: any) => {
                const fixedTimestamp = Math.floor(value * 1000);
                value = new Date(fixedTimestamp);
                const formattedDate = value.toLocaleString();
                return formattedDate;
            }
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
            type: ColumnType.HEDERA,
            field: 'owner',
            title: 'grid.account_id',
            width: '150px',
            hederaType: HederaType.ACCOUNT,
        },
        {
            type: ColumnType.TEXT,
            field: 'options.attributes.OrganizationName',
            title: 'grid.name',
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
        private landingService: LandingService,
        private cdr: ChangeDetectorRef,
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
            }),
            new Filter({
                label: 'grid.name',
                type: 'input',
                field: 'options.attributes.OrganizationName',
            })
        );
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;
        this.entitiesService.getRegistries(filters).subscribe({
            next: (result) => {
                this.setResult(result);
                this.onDataLoaded(result.items);
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

    private onDataLoaded(data: Registry[]): void {
        const topicIds = data.map(item => item.options.registrantTopicId);
        
        this.landingService.getDataPriorityLoadingProgress({ topicIds: topicIds }).subscribe({
            next: (result) => {
                this.alreadyExistPriorities = result.items.map(item => item.topicId);
                this.onPrioritizeCheck('options.registrantTopicId', this.alreadyExistPriorities);
                this.cdr.detectChanges();
            },
            error: ({ message }) => {
                this.loadingData = false;
                console.error(message);
            },
        });
    }

    public setPriorityDataLoading() {
        if (this.priorityChecked && this.priorityChecked.length > 0) {
            this.landingService.setDataPriorityLoadingProgress(this.priorityChecked).subscribe(data => {
                if (!data) {
                    console.log("Topic not found!")
                } else {
                    location.reload();
                }
            });
        }
    }

    public onPrioritizeCheck(checkField: string, value: string[]) {
        this.priorityChecked = value.filter(item => !this.alreadyExistPriorities.some(existItem => item === existItem));
        
        this.columns.forEach(column => {
            if (column.checkField == checkField) {
                column.checkGroup = value;
            }
        });
    }
}
