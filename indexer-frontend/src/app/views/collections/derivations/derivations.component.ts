import { Component, Input } from '@angular/core';
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
import { BaseGridComponent } from '../base-grid/base-grid.component';
import { TranslocoModule } from '@jsverse/transloco';
import { PaginatorModule } from 'primeng/paginator';
import { ChipsModule } from 'primeng/chips';
import { ColumnType, TableComponent } from '@components/table/table.component';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { HederaType } from '@components/hedera-explorer/hedera-explorer.component';
import { AnalyticsService } from '@services/analytics.service';

@Component({
    selector: 'app-derivations',
    templateUrl: './derivations.component.html',
    styleUrls: [
        '../base-grid/base-grid.component.scss',
        './derivations.component.scss',
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
export class DerivationsComponent extends BaseGridComponent {
    @Input() messageId!: string;
    priorityChecked: string[] = [];
    alreadyExistPriorities: string[] = [];

    columns: any[] = [
        {
            type: ColumnType.TEXT,
            field: 'topicId',
            title: 'grid.topic_id',
            width: '200px',
            link: {
                field: 'topicId',
                url: '/topics',
            },
        },
        {
            type: ColumnType.HEDERA,
            field: 'consensusTimestamp',
            title: 'grid.consensus_timestamp',
            width: '220px',
            sort: true,
            hederaType: HederaType.TRANSACTION,
        },
        {
            type: ColumnType.TEXT,
            field: 'options.name',
            title: 'grid.name',
            width: '200px',
        },
        {
            type: ColumnType.TEXT,
            field: 'options.version',
            title: 'grid.version',
            width: '120px',
        },
        {
            type: ColumnType.TEXT,
            className: 'text-multiline',
            field: 'options.owner',
            title: 'grid.owner',
            width: '550px',
        },
        {
            type: ColumnType.BUTTON,
            className: 'open-btn-end', 
            btn_label: 'grid.open',
            width: '100px',
            callback: this.onOpen.bind(this),
        },
    ];

    constructor(
        private analyticsService: AnalyticsService,
        route: ActivatedRoute,
        router: Router
    ) {
        super(route, router);

        this.orderField = 'consensusTimestamp';
        this.orderDir = 'desc';
    }

    protected loadData(): void {
        const filters = this.getFilters();
        this.loadingData = true;

        this.analyticsService.getDerivations(this.messageId, filters).subscribe({
            next: (result: any) => {
                this.setResult(result);
                setTimeout(() => {
                    this.loadingData = false;
                }, 500);
            },
            error: ({ message }: any) => {
                this.loadingData = false;
                console.error(message);
            },
        });
    }

    protected override loadFilters(): void {
    }
}
