import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { MatSort, Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { IGridFilters, IGridResults } from '@services/search.service';
import { Observer, Subscription } from 'rxjs';
import { FormControl } from '@angular/forms';
import { TablePageEvent } from 'primeng/table';
import { SortEvent } from 'primeng/api';

export class Filter {
    public readonly label: string;
    public readonly type: string;
    public readonly field: string;
    public readonly multiple: boolean;
    public readonly control: FormControl;
    public subscription?: Subscription;
    public data: any;

    constructor(option: {
        type: string;
        field: string;
        label: string;
        multiple?: boolean;
        control?: FormControl;
        data?: any;
    }) {
        this.label = option.label;
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
        this.control.setValue(value, {
            emitEvent: false,
        });
    }

    public get value(): any {
        return this.control.value;
    }
}

@Component({
    selector: 'base-grid',
    template: '',
    styles: [],
})
export abstract class BaseGridComponent {
    @ViewChild(MatSort) sort!: MatSort;

    public loadingData: boolean = true;
    public loadingFilters: boolean = true;

    public entity!: string;
    public pageIndex: number = 0;
    public pageSize: number = 10;
    public total: number = 0;
    public orderField: string = '';
    public orderDir: string = '';
    public items: any[] = [];

    public displayedColumns: string[] = [];
    public pageSizeOptions = [5, 10, 25, 100];

    public filters: Filter[] = [];
    public keywords: FormControl = new FormControl([]);

    private _keywordsSubscriber?: Subscription;
    private _queryObserver?: Subscription;

    constructor(protected route: ActivatedRoute, protected router: Router) {}

    ngOnInit(): void {
        this.loadingData = false;
        this.loadingFilters = false;
        this._queryObserver = this.route.queryParams.subscribe(
            (params: any) => {
                this._keywordsSubscriber?.unsubscribe();
                this.filters.forEach((filter) =>
                    filter.subscription?.unsubscribe()
                );
                if (params.pageIndex) {
                    this.pageIndex = Number(params.pageIndex);
                }
                if (params.pageSize) {
                    this.pageSize = Number(params.pageSize);
                }
                if (params.orderDir) {
                    this.orderDir = params.orderDir?.toLowerCase();
                }
                if (params.orderField) {
                    this.orderField = params.orderField;
                }
                if (params.keywords) {
                    try {
                        const keywords = JSON.parse(params.keywords);
                        if (Array.isArray(keywords)) {
                            this.keywords.patchValue(keywords);
                        }
                        // tslint:disable-next-line:no-empty
                    } catch {}
                }
                this._keywordsSubscriber = this.keywords.valueChanges.subscribe(
                    () => this.onFilter()
                );
                this.onNavigate(params);
            }
        );
        this.loadFilters();
    }

    ngOnDestroy(): void {
        this._queryObserver?.unsubscribe();
        this._keywordsSubscriber?.unsubscribe();
        this.filters.forEach((filter) => {
            filter.subscription =
                filter.control?.valueChanges.subscribe(() =>
                    this.onFilter()
                );
        });
    }

    ngAfterViewInit(): void {
        this.sort?.sortChange.subscribe(this.onSort.bind(this));
    }

    public onPage(pageEvent: PageEvent): void {
        this.pageIndex = pageEvent.pageIndex;
        this.pageSize = pageEvent.pageSize;
        this.updateRequest();
    }

    public onSort(sortEvent: Sort): void {
        this.orderField = sortEvent.active;
        this.orderDir = sortEvent.direction;
        this.updateRequest();
    }

    public onFilter() {
        this.pageIndex = 0;
        this.updateRequest();
    }

    public updateRequest(): void {
        const filters = this.getFilters();
        console.log(filters);
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: filters,
            // replaceUrl: true,
            // queryParamsHandling: 'merge',
        });
    }

    protected onNavigate(params: Params): void {
        // tslint:disable-next-line:forin
        for (const key in params) {
            const filter = this.filters.find((f) => f.field === key);
            if (filter) {
                filter.setValue(params[key]);
            }
        }
        this.filters.forEach((filter) => {
            filter.subscription =
                filter.control?.valueChanges.subscribe(() =>
                    this.onFilter()
                );
        });
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
        const keywords = this.keywords.value;
        if (Array.isArray(keywords) && keywords.length > 0) {
            filters.keywords = JSON.stringify(keywords);
        }
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

    public onOpen(element: any) {
        this.router.navigate([
            this.route.snapshot.url[0].path,
            element.consensusTimestamp,
        ]);
    }
}
