import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MatSort, Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { IGridFilters, IGridResults } from '@services/search.service';
import { Subscription } from 'rxjs';
import { FormControl } from '@angular/forms';

export class Filter {
    public readonly type: string;
    public readonly field: string;
    public readonly multiple: boolean;
    public readonly control: FormControl;
    public data: any;

    constructor(option: {
        type: string,
        field: string,
        multiple?: boolean,
        control?: FormControl,
        data?: any,
    }) {
        this.type = option.type;
        this.field = option.field;
        this.multiple = !!option.multiple;
        this.control = option.control || new FormControl();
        this.data = option.data;
    }

    public setData(data: any) {
        this.data = data;
    }

    public setValue(value: any) {
        this.control.setValue(value);
    }

    public get value(): any {
        return this.control.value;
    }
}

@Component({
    selector: 'base-grid',
    template: '',
    styles: []
})
export abstract class BaseGridComponent {
    @ViewChild(MatSort) sort!: MatSort;

    public loadingData: boolean = true;
    public loadingFilters: boolean = true;

    public pageIndex: number = 0;
    public pageSize: number = 20;
    public total: number = 0;
    public orderField: string = '';
    public orderDir: string = '';
    public items: any[] = [];

    public displayedColumns: string[] = [];
    public pageSizeOptions = [5, 10, 25, 100];

    public filters: Filter[] = [];

    private _queryObserver?: Subscription;

    constructor(
        protected route: ActivatedRoute,
        protected router: Router
    ) {
    }

    ngOnInit(): void {
        this.loadingData = false;
        this.loadingFilters = false;
        this._queryObserver = this.route.queryParams.subscribe(params => {
            this.onNavigate(params);
        });
        this.loadFilters();
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
        this.onFilter();
    }

    public onSort(sortEvent: Sort): void {
        this.orderField = sortEvent.active;
        this.orderDir = sortEvent.direction
        this.onFilter();
    }

    public onFilter(): void {
        const filters = this.getFilters();
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: filters,
            queryParamsHandling: 'merge'
        });
    }

    protected onNavigate(params: Params): void {
        for (const key in params) {
            const filter = this.filters.find((f) => f.field === key);
            if (filter) {
                filter.setValue(params[key]);
            }
        }
        this.loadData();
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

    protected setFilters(result?: any): void {
        if (result) {
            const configs = new Map();
            for (const filter of result) {
                configs.set(filter.field, filter.data);
            }
            for (const filter of this.filters) {
                filter.setData(configs.get(filter.field));
            }
        } else {
            for (const filter of this.filters) {
                filter.setData(null);
            }
        }
    }

    protected abstract loadData(): void;
    protected abstract loadFilters(): void;
}
