import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MatSort, Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { IGridFilters, IGridResults } from '../../../services/search.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'base-grid',
    template: '',
    styles: []
})
export abstract class BaseGridComponent {
    @ViewChild(MatSort) sort!: MatSort;

    public loading: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public orderField: string = '';
    public orderDir: string = '';
    public items: any[] = [];

    public displayedColumns: string[] = [];
    public pageSizeOptions = [5, 10, 25, 100];

    public filters: any[] = [];

    private _queryObserver?: Subscription;

    constructor(
        protected route: ActivatedRoute,
        protected router: Router
    ) {
    }

    ngOnInit(): void {
        this.loading = false;
        this._queryObserver = this.route.queryParams.subscribe(params => {
            this.onNavigate(params);
        });
        this.loadData();
    }

    ngOnDestroy(): void {
        this._queryObserver?.unsubscribe();
    }

    ngAfterViewInit(): void {
        this.sort?.sortChange.subscribe(this.onSort.bind(this));
    }

    public onPage(pageEvent: PageEvent): void {
        this.pageIndex = pageEvent.pageIndex;
        this.pageSize = pageEvent.pageSize;
        this.loadData();
    }

    public onSort(sortEvent: Sort): void {
        this.orderField = sortEvent.active;
        this.orderDir = sortEvent.direction
        this.loadData();
    }

    public onFilter(): void {
        const filters = this.getFilters();
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: filters,
            queryParamsHandling: 'merge'
        });
        this.loadData();
    }

    protected onNavigate(params: Params): void {

    }

    protected getFilters(): IGridFilters {
        const filters: IGridFilters = {};
        for (const filter of this.filters) {
            if (filter.value) {
                filters[filter.field] = filter.value;
            }
        }
        if (this.orderDir) {
            filters.orderDir = this.orderDir.toUpperCase();
            filters.orderField = this.orderField;
        }
        filters.pageIndex = this.pageIndex;
        filters.pageSize = this.pageSize;
        return filters;
    }

    protected setResult(result?: IGridResults): void {
        if (result) {
            this.items = result.items;
            this.total = result.total;
        } else {
            this.items = [];
            this.total = 0;
        }
    }

    protected abstract loadData(): void;
}
